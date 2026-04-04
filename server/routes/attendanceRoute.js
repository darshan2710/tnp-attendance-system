const express = require('express');
const { protect } = require('../middleware/auth');
const ProcessedAttendance = require('../models/ProcessedAttendance');
const { fetchAttendanceData } = require('../services/googleSheetsService');
const Papa = require('papaparse');

const router = express.Router();

router.use(protect);

// Helper: parse date strings like "22-Apr-26" or "22-Apr-2026" into real Date objects
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase().slice(0, 3);
    const month = MONTHS[monthStr];
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

// Helper: sort by date ascending, then roll ascending
const sortByDateAscThenRoll = (a, b) => {
  const da = parseDate(a.date);
  const db = parseDate(b.date);
  if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
  return (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' });
};

// GET /attendance — returns unprocessed records
router.get('/', async (req, res) => {
  try {
    const userRole = req.user.role;
    let subjectFilter = req.query.subject;

    if (userRole === 'professor') {
      if (!subjectFilter) return res.status(400).json({ message: 'A specific subject parameter must be explicitly requested.' });
      const allowed = req.user.subjects ? req.user.subjects.includes(subjectFilter) : (req.user.subject === subjectFilter);
      if (!allowed) return res.status(403).json({ message: 'Unauthorized access to this subject' });
    }

    if (!subjectFilter && userRole !== 'admin') {
      return res.status(400).json({ message: 'Subject is required for this action.' });
    }

    const allData = await fetchAttendanceData();
    
    let filteredData = allData;
    if (subjectFilter) {
      filteredData = allData.filter(row => row.subject.toLowerCase() === subjectFilter.toLowerCase());
    }

    let processedRecordsQuery = {};
    if (subjectFilter) {
      processedRecordsQuery.subject = new RegExp('^' + subjectFilter + '$', 'i');
    }
    const processedRecords = await ProcessedAttendance.find(processedRecordsQuery);

    const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}_${pr.roll}`.toLowerCase()));

    const unprocessedData = filteredData.filter(row => {
      const id = `${row.date}_${row.subject}_${row.roll}`.toLowerCase();
      return !processedSet.has(id);
    });

    unprocessedData.sort(sortByDateAscThenRoll);
    res.json(unprocessedData);
  } catch (error) {
    console.error('GET /attendance error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /attendance/mark — stores granular per-record processed entries
router.post('/mark', async (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Invalid input: records array required' });
    }

    // Validate each record has required fields
    const documents = records.map(r => ({
      date: r.date,
      subject: r.subject,
      roll: r.roll,
      name: r.name || '',
      reason: r.reason || ''
    }));

    const invalidDocs = documents.filter(d => !d.date || !d.subject || !d.roll);
    if (invalidDocs.length > 0) {
      return res.status(400).json({ 
        message: `Invalid records: ${invalidDocs.length} record(s) missing required fields (date, subject, roll)`,
        invalidCount: invalidDocs.length
      });
    }
    
    let insertedCount = 0;
    let duplicateCount = 0;

    try {
      const result = await ProcessedAttendance.insertMany(documents, { ordered: false });
      insertedCount = result.length;
    } catch (insertError) {
      // Handle bulk write errors (some succeed, some are duplicates)
      if (insertError.insertedDocs) {
        insertedCount = insertError.insertedDocs.length;
      }
      if (insertError.writeErrors) {
        duplicateCount = insertError.writeErrors.filter(e => e.err?.code === 11000 || e.code === 11000).length;
        const otherErrors = insertError.writeErrors.filter(e => e.err?.code !== 11000 && e.code !== 11000);
        if (otherErrors.length > 0) {
          console.error('Non-duplicate insert errors:', otherErrors);
          return res.status(500).json({ 
            message: `Partial failure: ${otherErrors.length} record(s) failed to save`,
            insertedCount,
            errorCount: otherErrors.length
          });
        }
      } else if (insertError.code !== 11000) {
        console.error('Insert error:', insertError);
        return res.status(500).json({ message: 'Failed to save records: ' + insertError.message });
      }
    }

    // Return the successfully marked records so frontend can use them
    res.json({ 
      message: 'Marked as processed successfully',
      insertedCount,
      duplicateCount,
      records: documents
    });
  } catch (error) {
    console.error('POST /attendance/mark error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// GET /attendance/marked — returns all previously processed records
router.get('/marked', async (req, res) => {
  try {
    const userRole = req.user.role;
    let subjectFilter = req.query.subject;

    if (userRole === 'professor') {
      if (!subjectFilter) return res.status(400).json({ message: 'Subject parameter required for professor.' });
      const allowed = req.user.subjects ? req.user.subjects.includes(subjectFilter) : (req.user.subject === subjectFilter);
      if (!allowed) return res.status(403).json({ message: 'Unauthorized access to this subject' });
    }

    let query = {};
    if (subjectFilter) {
      query.subject = new RegExp('^' + subjectFilter + '$', 'i');
    }

    const markedRecords = await ProcessedAttendance.find(query).lean();

    markedRecords.sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (da.getTime() !== db.getTime()) return db.getTime() - da.getTime();
      return (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json(markedRecords);
  } catch (error) {
    console.error('GET /attendance/marked error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Helper for download
const getUnprocessedData = async (req) => {
  const userRole = req.user.role;
  let subjectFilter = req.query.subject || (req.body ? req.body.subject : undefined);

  if (userRole === 'professor') {
    if (!subjectFilter) throw new Error('Professor requires a strict subject filter payload');
    const allowed = req.user.subjects ? req.user.subjects.includes(subjectFilter) : (req.user.subject === subjectFilter);
    if (!allowed) throw new Error('Unauthorized access to this subject export');
  }

  const allData = await fetchAttendanceData();
  
  let filteredData = allData;
  if (subjectFilter) {
    filteredData = allData.filter(row => row.subject.toLowerCase() === subjectFilter.toLowerCase());
  }

  let processedRecordsQuery = {};
  if (subjectFilter) {
    processedRecordsQuery.subject = new RegExp('^' + subjectFilter + '$', 'i');
  }
  const processedRecords = await ProcessedAttendance.find(processedRecordsQuery);

  const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}_${pr.roll}`.toLowerCase()));

  const unprocessedData = filteredData.filter(row => {
    const id = `${row.date}_${row.subject}_${row.roll}`.toLowerCase();
    return !processedSet.has(id);
  });

  unprocessedData.sort(sortByDateAscThenRoll);

  return { subjectFilter, data: unprocessedData };
};

// GET /attendance/download
router.get('/download', async (req, res) => {
  try {
    const { subjectFilter, data: unprocessedData } = await getUnprocessedData(req);

    if (unprocessedData.length === 0) {
      return res.status(404).json({ message: 'No data available to download' });
    }

    const csv = Papa.unparse(unprocessedData);
    
    const subjectPrefix = subjectFilter ? subjectFilter : 'global';
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `${subjectPrefix}_attendance_${currentDate}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.status(200).send(csv);
  } catch (error) {
    console.error('DOWNLOAD ERROR TRACE:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

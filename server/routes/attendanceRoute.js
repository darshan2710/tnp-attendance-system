const express = require('express');
const { protect } = require('../middleware/auth');
const ProcessedAttendance = require('../models/ProcessedAttendance');
const { fetchAttendanceData } = require('../services/googleSheetsService');
const Papa = require('papaparse');

const router = express.Router();

router.use(protect);

// Helper: sort by roll number (natural/numeric sort)
const sortByRoll = (a, b) => {
  return a.roll.localeCompare(b.roll, undefined, { numeric: true, sensitivity: 'base' });
};

// GET /attendance — returns unprocessed records (granular per-record filtering)
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

    // Granular filtering: check each individual record against ProcessedAttendance
    let processedRecordsQuery = {};
    if (subjectFilter) {
      processedRecordsQuery.subject = new RegExp('^' + subjectFilter + '$', 'i');
    }
    const processedRecords = await ProcessedAttendance.find(processedRecordsQuery);

    // Build set with granular key: date_subject_roll
    const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}_${pr.roll}`.toLowerCase()));

    const unprocessedData = filteredData.filter(row => {
      const id = `${row.date}_${row.subject}_${row.roll}`.toLowerCase();
      return !processedSet.has(id);
    });

    // Sort by roll number
    unprocessedData.sort(sortByRoll);

    res.json(unprocessedData);
  } catch (error) {
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
    
    const documents = records.map(r => ({
      date: r.date,
      subject: r.subject,
      roll: r.roll,
      name: r.name || '',
      reason: r.reason || ''
    }));
    
    try {
      await ProcessedAttendance.insertMany(documents, { ordered: false });
    } catch (insertError) {
      // Ignore duplicate key errors (code 11000) — records already processed
      if (insertError.code !== 11000 && !(insertError.writeErrors && insertError.writeErrors.every(e => e.err?.code === 11000))) {
        console.error('Insert error details:', insertError);
      }
    }

    res.json({ message: 'Marked as processed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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

    const markedRecords = await ProcessedAttendance.find(query)
      .sort({ date: -1, roll: 1 })
      .lean();

    res.json(markedRecords);
  } catch (error) {
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

  // Granular filtering
  const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}_${pr.roll}`.toLowerCase()));

  const unprocessedData = filteredData.filter(row => {
    const id = `${row.date}_${row.subject}_${row.roll}`.toLowerCase();
    return !processedSet.has(id);
  });

  // Sort by roll number
  unprocessedData.sort(sortByRoll);

  return {
    subjectFilter,
    data: unprocessedData
  };
};

// GET /attendance/download — CSV export of unprocessed data
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

const express = require('express');
const { protect } = require('../middleware/auth');
const ProcessedAttendance = require('../models/ProcessedAttendance');
const { fetchAttendanceData } = require('../services/googleSheetsService');
const Papa = require('papaparse');

const router = express.Router();

router.use(protect);

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

    const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}`.toLowerCase()));

    const unprocessedData = filteredData.filter(row => {
      const id = `${row.date}_${row.subject}`.toLowerCase();
      return !processedSet.has(id);
    });

    res.json(unprocessedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/mark', async (req, res) => {
  try {
    const { subject, dates } = req.body;
    if (!subject || !dates || !Array.isArray(dates)) {
      return res.status(400).json({ message: 'Invalid input parameters' });
    }
    
    const records = dates.map(date => ({ date, subject }));
    
    try {
      await ProcessedAttendance.insertMany(records, { ordered: false });
    } catch (insertError) {
      if (insertError.code !== 11000) {
        console.error('Insert error details:', insertError);
      }
    }

    res.json({ message: 'Marked as processed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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

  const processedSet = new Set(processedRecords.map(pr => `${pr.date}_${pr.subject}`.toLowerCase()));

  return {
    subjectFilter,
    data: filteredData.filter(row => {
      const id = `${row.date}_${row.subject}`.toLowerCase();
      return !processedSet.has(id);
    })
  };
};

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

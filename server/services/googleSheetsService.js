const axios = require('axios');
const Papa = require('papaparse');

const SHEET_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1Gvj7g-xwIAQEurLraGoJ-Rv6TZLiGSrUcTdoi_mpg7A/export?format=csv';

const fetchAttendanceData = async () => {
  try {
    const response = await axios.get(SHEET_EXPORT_URL);
    const parsed = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true
    });
    
    const records = [];

    parsed.data.forEach(row => {
      const getVal = (keyName) => {
        const key = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return key ? row[key].trim() : '';
      };
      
      const date = getVal('Date');
      const roll = getVal('Register No.') || getVal('Register No');
      const name = getVal('Name') || getVal('Student Name');
      const subjectRaw = getVal('Subjects') || getVal('Subject');
      const reason = getVal('Reason');

      if (!date || !roll || !subjectRaw) return;

      // Handle comma-separated subjects: "ML, AVR" → two separate records
      const subjects = subjectRaw.split(',').map(s => s.trim()).filter(s => s);

      subjects.forEach(subject => {
        records.push({ date, roll, name, subject, reason });
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error.message);
    throw new Error('Could not fetch data from Google Sheets');
  }
};

module.exports = { fetchAttendanceData };

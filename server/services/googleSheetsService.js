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
    
    const data = parsed.data.map(row => {
      const getVal = (keyName) => {
        const key = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return key ? row[key].trim() : '';
      };
      
      return {
        date: getVal('Date'),
        roll: getVal('Register No.') || getVal('Register No'),
        name: getVal('Name') || getVal('Student Name'),
        subject: getVal('Subjects') || getVal('Subject')
      };
    }).filter(row => row.date && row.roll && row.subject);
    
    return data;
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error.message);
    throw new Error('Could not fetch data from Google Sheets');
  }
};

module.exports = { fetchAttendanceData };

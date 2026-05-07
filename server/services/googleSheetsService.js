const axios = require('axios');
const Papa = require('papaparse');

const SHEET_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/1Gvj7g-xwIAQEurLraGoJ-Rv6TZLiGSrUcTdoi_mpg7A/export?format=csv';

// ═══ IN-MEMORY CACHE ═══
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let cachedData = null;
let cacheTimestamp = 0;

const fetchAttendanceData = async (forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if still fresh
  if (!forceRefresh && cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log('[SHEETS] Returning cached data');
    return cachedData;
  }

  try {
    console.log('[SHEETS] Fetching fresh data from Google Sheets...');
    const response = await axios.get(SHEET_EXPORT_URL, { timeout: 10000 });
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
      const roll = getVal('Registration No.') || getVal('Registration No');
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

    // Update cache
    cachedData = records;
    cacheTimestamp = now;
    
    return records;
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error.message);
    // If fetch fails but we have stale cache, return it rather than crashing
    if (cachedData) {
      console.log('[SHEETS] Fetch failed, returning stale cache');
      return cachedData;
    }
    throw new Error('Could not fetch data from Google Sheets');
  }
};

// Invalidate cache (call after marking/unmarking to keep data fresh)
const invalidateCache = () => {
  cachedData = null;
  cacheTimestamp = 0;
};

module.exports = { fetchAttendanceData, invalidateCache };

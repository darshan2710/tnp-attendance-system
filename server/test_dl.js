const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { fetchAttendanceData } = require('./services/googleSheetsService');
const Papa = require('papaparse');
dotenv.config();

async function runTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB.");

    const allData = await fetchAttendanceData();
    console.log("Fetched data:", allData.length);

    const unprocessedData = allData.slice(0, 10);
    const csv = Papa.unparse(unprocessedData);
    console.log("CSV Output Success! Length:", csv.length);
  } catch(e) {
    console.error("Test error:", e.stack);
  } finally {
    process.exit(0);
  }
}

runTest();

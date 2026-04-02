const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoute');
const adminRoutes = require('./routes/adminRoute');
const attendanceRoutes = require('./routes/attendanceRoute');
const User = require('./models/User');
const ProcessedAttendance = require('./models/ProcessedAttendance');

const app = express();

app.use(cors({
  origin: "https://iiitsurat-tnp-attendance.netlify.app"
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TnP Attendance API is running' });
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/attendance', attendanceRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tnp-attendance';

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: 'tnp@iiitsurat.ac.in' });
    if (!adminExists) {
      await User.create({
        email: 'tnp@iiitsurat.ac.in',
        password: 'admin',
        role: 'admin'
      });
      console.log('Seed Admin User created with email: tnp@iiitsurat.ac.in and password: admin');
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
  }
};

// Fix stale indexes on ProcessedAttendance collection
const ensureCorrectIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('processedattendances');
    const indexes = await collection.indexes();
    
    // Check for old index {date:1, subject:1} without roll
    const hasOldIndex = indexes.some(idx => {
      const keys = Object.keys(idx.key);
      return keys.length === 2 && idx.key.date && idx.key.subject && !idx.key.roll && idx.unique;
    });

    if (hasOldIndex) {
      console.log('Detected old ProcessedAttendance index {date, subject}. Dropping collection to rebuild with {date, subject, roll}...');
      await collection.drop();
      console.log('Old collection dropped. New index will be created automatically.');
    }
  } catch (err) {
    // Collection might not exist yet — that's fine
    if (err.codeName !== 'NamespaceNotFound') {
      console.error('Index migration check error:', err.message);
    }
  }
};

// Start the server immediately so Railway doesn't timeout
// Bind to 0.0.0.0 explicitly for Railway container networking
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB separately
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await ensureCorrectIndexes();
    await seedAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

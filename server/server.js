const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoute');
const adminRoutes = require('./routes/adminRoute');
const attendanceRoutes = require('./routes/attendanceRoute');
const User = require('./models/User');

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TnP Attendance API is running' });
});

// Diagnostic endpoint to check MongoDB state (temporary - for debugging)
app.get('/debug/db-status', async (req, res) => {
  try {
    const readyState = mongoose.connection.readyState;
    const stateNames = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    
    const result = {
      mongoState: stateNames[readyState] || `unknown(${readyState})`,
      dbName: mongoose.connection.db?.databaseName || 'N/A',
    };

    if (readyState === 1) {
      try {
        const ProcessedAttendance = require('./models/ProcessedAttendance');
        const count = await ProcessedAttendance.countDocuments();
        result.processedAttendanceCount = count;
        
        const recent = await ProcessedAttendance.find({}).sort({ createdAt: -1 }).limit(5).lean();
        result.recentRecords = recent.map(r => ({
          date: r.date,
          subject: r.subject,
          roll: r.roll,
          name: r.name,
          createdAt: r.createdAt
        }));

        const col = mongoose.connection.collection('processedattendances');
        const indexes = await col.indexes();
        result.indexes = indexes.map(i => ({ name: i.name, key: i.key, unique: !!i.unique }));
      } catch (dbErr) {
        result.dbQueryError = dbErr.message;
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/attendance', attendanceRoutes);

const PORT = process.env.PORT || 8080;
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

// Safely fix stale indexes on ProcessedAttendance collection
// Only drops the specific old index, NOT the entire collection
const ensureCorrectIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('processedattendances');
    const indexes = await collection.indexes();

    // Check for old index {date:1, subject:1} without roll
    for (const idx of indexes) {
      const keys = Object.keys(idx.key);
      if (keys.length === 2 && idx.key.date && idx.key.subject && !idx.key.roll && idx.unique) {
        console.log(`Dropping stale index "${idx.name}" {date, subject}...`);
        await collection.dropIndex(idx.name);
        console.log('Stale index dropped. Correct index {date, subject, roll} will be ensured by Mongoose.');
      }
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

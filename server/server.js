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

app.use(cors());
app.use(express.json());

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

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    seedAdmin();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));

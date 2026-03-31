const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();
router.use(protect, admin);

router.get('/professors', async (req, res) => {
  try {
    const professors = await User.find({ role: 'professor' }).select('-password');
    res.json(professors);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/add-professor', async (req, res) => {
  const { email, password, subject } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });
    
    let subjectsArray = [];
    if (subject) {
      subjectsArray = [...new Set(subject.split(',').map(s => s.trim().toUpperCase()).filter(s => s))];
    }

    const user = await User.create({ email, password, subjects: subjectsArray, role: 'professor' });
    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      subjects: user.subjects
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/remove-professor/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Professor removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/update-subjects/:id', async (req, res) => {
  const { subject } = req.body;
  try {
    const professor = await User.findById(req.params.id);
    if (!professor) return res.status(404).json({ message: 'Professor not found' });
    
    let subjectsArray = [];
    if (subject) {
      subjectsArray = [...new Set(subject.split(',').map(s => s.trim().toUpperCase()).filter(s => s))];
    }
    
    professor.subjects = subjectsArray;
    await professor.save();
    res.json(professor);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

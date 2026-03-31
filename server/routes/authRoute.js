const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const OTP = require('../models/OTP');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '30d' });
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        subjects: user.subjects,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database safely
    await OTP.deleteMany({ email }); // Clear any existing OTP instances implicitly
    await OTP.create({ email, otp: otpCode, expiresAt });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'T&P Portal - Password Reset OTP',
      text: `Your One-Time Password (OTP) for resetting your T&P Portal password is: ${otpCode}\n\nThis OTP is valid for exactly 10 minutes.\nIf you did not request this reset, please instantly ignore this email.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully to email' });
  } catch (error) {
    console.error('Forgot Password Setup Error:', error);
    res.status(500).json({ message: 'Failed to process forgot password request' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Save triggers native pre-save bcrypt hook implicitly
    user.password = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });
    res.json({ message: 'Password reset completely successful' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Failed to securely reset password' });
  }
});

module.exports = router;

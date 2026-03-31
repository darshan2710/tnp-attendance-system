const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' }, // Automatically delete after 10 minutes
  }
}, { timestamps: true });

module.exports = mongoose.model('OTP', otpSchema);

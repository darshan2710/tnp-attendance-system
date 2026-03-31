const mongoose = require('mongoose');

const processedAttendanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Ensure uniqueness of date + subject strictly natively bounding daily processing queues
processedAttendanceSchema.index({ date: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('ProcessedAttendance', processedAttendanceSchema);

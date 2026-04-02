const mongoose = require('mongoose');

const processedAttendanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  roll: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Granular uniqueness: each specific student+date+subject combo is tracked individually
processedAttendanceSchema.index({ date: 1, subject: 1, roll: 1 }, { unique: true });

module.exports = mongoose.model('ProcessedAttendance', processedAttendanceSchema);

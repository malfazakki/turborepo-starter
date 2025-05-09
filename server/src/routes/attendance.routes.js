const express = require('express');
const {
  getAttendanceBySession,
  getAttendanceByUser,
  updateAttendance,
  bulkUpdateAttendance,
  getAttendanceStats,
  createAttendanceRecords,
  generateAttendanceForBatch
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Attendance stats route
router
  .route('/stats')
  .get(protect, authorize('admin', 'staff'), getAttendanceStats);

// Individual attendance record update
router
  .route('/:id')
  .put(protect, authorize('admin', 'staff'), updateAttendance);

module.exports = router;
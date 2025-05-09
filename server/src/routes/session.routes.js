const express = require('express');
const { protect, authorize } = require('../middleware/auth');

// Import session controller (to be implemented)
const {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession
} = require('../controllers/session.controller');

// Import attendance controller functions for session-related routes
const {
  getAttendanceBySession,
  bulkUpdateAttendance,
  createAttendanceRecords,
  generateAttendanceForBatch
} = require('../controllers/attendance.controller');

const router = express.Router();

// Session routes
router
  .route('/')
  .get(protect, getSessions)
  .post(protect, authorize('admin', 'staff'), createSession);

router
  .route('/:id')
  .get(protect, getSession)
  .put(protect, authorize('admin', 'staff'), updateSession)
  .delete(protect, authorize('admin'), deleteSession);

// Session attendance routes
router
  .route('/:sessionId/attendance')
  .get(protect, getAttendanceBySession)
  .post(protect, authorize('admin', 'staff'), createAttendanceRecords)
  .put(protect, authorize('admin', 'staff'), bulkUpdateAttendance);

router
  .route('/:sessionId/generate-attendance')
  .post(protect, authorize('admin', 'staff'), generateAttendanceForBatch);

// Filtered attendance endpoints
router
  .route('/:sessionId/users-for-attendance')
  .get(protect, authorize('admin', 'staff'), getUsersForAttendance);

router
  .route('/:sessionId/filtered-attendance')
  .post(protect, authorize('admin', 'staff'), bulkCreateUpdateFilteredAttendance);

module.exports = router;
const express = require('express');
const { protect, authorize } = require('../middleware/auth');

// Import user controller (to be implemented)
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');

// Import attendance controller for user-related routes
const { getAttendanceByUser } = require('../controllers/attendance.controller');

const router = express.Router();

// User routes
router
  .route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(protect, authorize('admin'), createUser);

router
  .route('/:id')
  .get(protect, getUser)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

// User attendance routes
router
  .route('/:userId/attendance')
  .get(protect, getAttendanceByUser);

module.exports = router;
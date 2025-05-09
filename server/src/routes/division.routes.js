const express = require('express');
const {
  getDivisions,
  getDivision,
  createDivision,
  updateDivision,
  deleteDivision
} = require('../controllers/division.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, getDivisions)
  .post(protect, authorize('admin'), createDivision);

router
  .route('/:id')
  .get(protect, getDivision)
  .put(protect, authorize('admin'), updateDivision)
  .delete(protect, authorize('admin'), deleteDivision);

module.exports = router;
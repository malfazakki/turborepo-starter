const express = require('express');
const {
  getBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batch.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .get(protect, getBatches)
  .post(protect, authorize('admin'), createBatch);

router
  .route('/:id')
  .get(protect, getBatch)
  .put(protect, authorize('admin'), updateBatch)
  .delete(protect, authorize('admin'), deleteBatch);

module.exports = router;
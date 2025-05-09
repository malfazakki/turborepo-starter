const { Batch, User } = require('../models');

// @desc    Get all batches
// @route   GET /api/batches
// @access  Private
exports.getBatches = async (req, res, next) => {
  try {
    const batches = await Batch.findAll({
      order: [['year', 'DESC'], ['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: batches.length,
      data: batches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single batch
// @route   GET /api/batches/:id
// @access  Private
exports.getBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: `Batch with id ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new batch
// @route   POST /api/batches
// @access  Private/Admin
exports.createBatch = async (req, res, next) => {
  try {
    const { name, year, isActive } = req.body;

    // Check if batch with same name and year already exists
    const batchExists = await Batch.findOne({
      where: { name, year }
    });

    if (batchExists) {
      return res.status(400).json({
        success: false,
        message: 'Batch with this name and year already exists'
      });
    }

    const batch = await Batch.create({
      name,
      year,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private/Admin
exports.updateBatch = async (req, res, next) => {
  try {
    const { name, year, isActive } = req.body;

    let batch = await Batch.findByPk(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: `Batch with id ${req.params.id} not found`
      });
    }

    // Check if updated name and year would create a duplicate
    if (name && year) {
      const duplicateBatch = await Batch.findOne({
        where: { name, year },
        where: {
          id: { [Op.ne]: req.params.id },
          name,
          year
        }
      });

      if (duplicateBatch) {
        return res.status(400).json({
          success: false,
          message: 'Batch with this name and year already exists'
        });
      }
    }

    batch = await batch.update({
      name: name || batch.name,
      year: year || batch.year,
      isActive: isActive !== undefined ? isActive : batch.isActive
    });

    res.status(200).json({
      success: true,
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /api/batches/:id
// @access  Private/Admin
exports.deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: `Batch with id ${req.params.id} not found`
      });
    }

    // Check if batch has associated users
    const userCount = await User.count({ where: { batchId: req.params.id } });

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete batch with ${userCount} associated users`
      });
    }

    await batch.destroy();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
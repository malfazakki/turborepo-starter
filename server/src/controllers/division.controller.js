const { Division, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all divisions
// @route   GET /api/divisions
// @access  Private
exports.getDivisions = async (req, res, next) => {
  try {
    const divisions = await Division.findAll({
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: divisions.length,
      data: divisions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single division
// @route   GET /api/divisions/:id
// @access  Private
exports.getDivision = async (req, res, next) => {
  try {
    const division = await Division.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
    });

    if (!division) {
      return res.status(404).json({
        success: false,
        message: `Division with id ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new division
// @route   POST /api/divisions
// @access  Private/Admin
exports.createDivision = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;

    // Check if division with same name already exists
    const divisionExists = await Division.findOne({
      where: { name }
    });

    if (divisionExists) {
      return res.status(400).json({
        success: false,
        message: 'Division with this name already exists'
      });
    }

    const division = await Division.create({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update division
// @route   PUT /api/divisions/:id
// @access  Private/Admin
exports.updateDivision = async (req, res, next) => {
  try {
    const { name, description, isActive } = req.body;

    let division = await Division.findByPk(req.params.id);

    if (!division) {
      return res.status(404).json({
        success: false,
        message: `Division with id ${req.params.id} not found`
      });
    }

    // Check if updated name would create a duplicate
    if (name && name !== division.name) {
      const duplicateDivision = await Division.findOne({
        where: {
          id: { [Op.ne]: req.params.id },
          name
        }
      });

      if (duplicateDivision) {
        return res.status(400).json({
          success: false,
          message: 'Division with this name already exists'
        });
      }
    }

    division = await division.update({
      name: name || division.name,
      description: description !== undefined ? description : division.description,
      isActive: isActive !== undefined ? isActive : division.isActive
    });

    res.status(200).json({
      success: true,
      data: division
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete division
// @route   DELETE /api/divisions/:id
// @access  Private/Admin
exports.deleteDivision = async (req, res, next) => {
  try {
    const division = await Division.findByPk(req.params.id);

    if (!division) {
      return res.status(404).json({
        success: false,
        message: `Division with id ${req.params.id} not found`
      });
    }

    // Check if division has associated users
    const userCount = await User.count({ where: { divisionId: req.params.id } });

    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete division with ${userCount} associated users`
      });
    }

    await division.destroy();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
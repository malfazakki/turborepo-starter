const { SessionType, Session } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all session types
// @route   GET /api/session-types
// @access  Private
exports.getSessionTypes = async (req, res, next) => {
  try {
    const sessionTypes = await SessionType.findAll({
      order: [['startTime', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: sessionTypes.length,
      data: sessionTypes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single session type
// @route   GET /api/session-types/:id
// @access  Private
exports.getSessionType = async (req, res, next) => {
  try {
    const sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: `Session type with id ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new session type
// @route   POST /api/session-types
// @access  Private/Admin
exports.createSessionType = async (req, res, next) => {
  try {
    const { name, description, startTime, endTime, isActive } = req.body;

    // Validate time format (assuming HH:MM format)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time must be in HH:MM format'
      });
    }

    // Check if end time is after start time
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Check for overlapping session types
    const overlappingSessionType = await SessionType.findOne({
      where: {
        [Op.or]: [
          {
            startTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            endTime: {
              [Op.between]: [startTime, endTime]
            }
          },
          {
            [Op.and]: [
              { startTime: { [Op.lte]: startTime } },
              { endTime: { [Op.gte]: endTime } }
            ]
          }
        ]
      }
    });

    if (overlappingSessionType) {
      return res.status(400).json({
        success: false,
        message: 'This session type overlaps with an existing session type'
      });
    }

    const sessionType = await SessionType.create({
      name,
      description,
      startTime,
      endTime,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session type
// @route   PUT /api/session-types/:id
// @access  Private/Admin
exports.updateSessionType = async (req, res, next) => {
  try {
    const { name, description, startTime, endTime, isActive } = req.body;

    let sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: `Session type with id ${req.params.id} not found`
      });
    }

    // Validate time format if provided
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (
      (startTime && !timeRegex.test(startTime)) ||
      (endTime && !timeRegex.test(endTime))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time must be in HH:MM format'
      });
    }

    // Check if end time is after start time
    const newStartTime = startTime || sessionType.startTime;
    const newEndTime = endTime || sessionType.endTime;

    if (newStartTime >= newEndTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Check for overlapping session types if times are being updated
    if (startTime || endTime) {
      const overlappingSessionType = await SessionType.findOne({
        where: {
          id: { [Op.ne]: req.params.id },
          [Op.or]: [
            {
              startTime: {
                [Op.between]: [newStartTime, newEndTime]
              }
            },
            {
              endTime: {
                [Op.between]: [newStartTime, newEndTime]
              }
            },
            {
              [Op.and]: [
                { startTime: { [Op.lte]: newStartTime } },
                { endTime: { [Op.gte]: newEndTime } }
              ]
            }
          ]
        }
      });

      if (overlappingSessionType) {
        return res.status(400).json({
          success: false,
          message: 'This session type would overlap with an existing session type'
        });
      }
    }

    sessionType = await sessionType.update({
      name: name || sessionType.name,
      description: description !== undefined ? description : sessionType.description,
      startTime: startTime || sessionType.startTime,
      endTime: endTime || sessionType.endTime,
      isActive: isActive !== undefined ? isActive : sessionType.isActive
    });

    res.status(200).json({
      success: true,
      data: sessionType
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete session type
// @route   DELETE /api/session-types/:id
// @access  Private/Admin
exports.deleteSessionType = async (req, res, next) => {
  try {
    const sessionType = await SessionType.findByPk(req.params.id);

    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: `Session type with id ${req.params.id} not found`
      });
    }

    // Check if session type has associated sessions
    const sessionCount = await Session.count({
      where: { sessionTypeId: req.params.id }
    });

    if (sessionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete session type with ${sessionCount} associated sessions`
      });
    }

    await sessionType.destroy();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
const { Session, SessionType, Attendance, User, Batch } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res, next) => {
  try {
    const { date, batchId, sessionTypeId } = req.query;
    const whereClause = {};

    // Filter by date if provided
    if (date) {
      whereClause.date = date;
    }

    // Filter by batch if provided
    if (batchId) {
      whereClause.batchId = batchId;
    }

    // Filter by session type if provided
    if (sessionTypeId) {
      whereClause.sessionTypeId = sessionTypeId;
    }

    const sessions = await Session.findAll({
      where: whereClause,
      include: [
        { model: SessionType },
        { model: Batch }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Private
exports.getSession = async (req, res, next) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [
        { model: SessionType },
        { model: Batch },
        {
          model: Attendance,
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }]
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${req.params.id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new session
// @route   POST /api/sessions
// @access  Private/Admin
exports.createSession = async (req, res, next) => {
  try {
    const { date, sessionTypeId, batchId, notes } = req.body;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in YYYY-MM-DD format'
      });
    }

    // Check if session type exists
    const sessionType = await SessionType.findByPk(sessionTypeId);
    if (!sessionType) {
      return res.status(404).json({
        success: false,
        message: `Session type with id ${sessionTypeId} not found`
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: `Batch with id ${batchId} not found`
      });
    }

    // Check if session already exists for this date, session type, and batch
    const existingSession = await Session.findOne({
      where: {
        date,
        sessionTypeId,
        batchId
      }
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'A session already exists for this date, session type, and batch'
      });
    }

    const session = await Session.create({
      date,
      sessionTypeId,
      batchId,
      notes,
      status: 'scheduled' // Default status
    });

    // Create attendance records for all users in the batch
    const users = await User.findAll({
      where: {
        batchId,
        role: 'santri' // Only create attendance for santri users
      }
    });

    if (users.length > 0) {
      const attendanceRecords = users.map(user => ({
        sessionId: session.id,
        userId: user.id,
        status: 'absent', // Default status
        verifiedBy: null,
        verifiedAt: null
      }));

      await Attendance.bulkCreate(attendanceRecords);
    }

    // Fetch the created session with its relationships
    const createdSession = await Session.findByPk(session.id, {
      include: [
        { model: SessionType },
        { model: Batch }
      ]
    });

    res.status(201).json({
      success: true,
      data: createdSession
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private/Admin
exports.updateSession = async (req, res, next) => {
  try {
    const { date, sessionTypeId, batchId, notes, status } = req.body;

    let session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${req.params.id} not found`
      });
    }

    // Validate date format if provided
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          message: 'Date must be in YYYY-MM-DD format'
        });
      }
    }

    // Check if session type exists if provided
    if (sessionTypeId) {
      const sessionType = await SessionType.findByPk(sessionTypeId);
      if (!sessionType) {
        return res.status(404).json({
          success: false,
          message: `Session type with id ${sessionTypeId} not found`
        });
      }
    }

    // Check if batch exists if provided
    if (batchId) {
      const batch = await Batch.findByPk(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: `Batch with id ${batchId} not found`
        });
      }
    }

    // Check if updating would create a duplicate
    if (date || sessionTypeId || batchId) {
      const newDate = date || session.date;
      const newSessionTypeId = sessionTypeId || session.sessionTypeId;
      const newBatchId = batchId || session.batchId;

      const existingSession = await Session.findOne({
        where: {
          id: { [Op.ne]: req.params.id },
          date: newDate,
          sessionTypeId: newSessionTypeId,
          batchId: newBatchId
        }
      });

      if (existingSession) {
        return res.status(400).json({
          success: false,
          message: 'A session already exists for this date, session type, and batch'
        });
      }
    }

    // Validate status if provided
    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    session = await session.update({
      date: date || session.date,
      sessionTypeId: sessionTypeId || session.sessionTypeId,
      batchId: batchId || session.batchId,
      notes: notes !== undefined ? notes : session.notes,
      status: status || session.status
    });

    // If batch is changed, update attendance records
    if (batchId && batchId !== session.batchId) {
      // Delete existing attendance records
      await Attendance.destroy({
        where: { sessionId: session.id }
      });

      // Create new attendance records for all users in the new batch
      const users = await User.findAll({
        where: {
          batchId,
          role: 'santri'
        }
      });

      if (users.length > 0) {
        const attendanceRecords = users.map(user => ({
          sessionId: session.id,
          userId: user.id,
          status: 'absent',
          verifiedBy: null,
          verifiedAt: null
        }));

        await Attendance.bulkCreate(attendanceRecords);
      }
    }

    // Fetch the updated session with its relationships
    const updatedSession = await Session.findByPk(session.id, {
      include: [
        { model: SessionType },
        { model: Batch }
      ]
    });

    res.status(200).json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private/Admin
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${req.params.id} not found`
      });
    }

    // Delete associated attendance records
    await Attendance.destroy({
      where: { sessionId: req.params.id }
    });

    // Delete the session
    await session.destroy();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
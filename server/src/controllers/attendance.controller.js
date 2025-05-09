const { Attendance, Session, User, SessionType, Batch } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all attendance records for a session
// @route   GET /api/sessions/:sessionId/attendance
// @access  Private
exports.getAttendanceBySession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    const attendance = await Attendance.findAll({
      where: { sessionId },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'role'] },
        {
          model: Session,
          include: [
            { model: SessionType },
            { model: Batch }
          ]
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance records for a user
// @route   GET /api/users/:userId/attendance
// @access  Private
exports.getAttendanceByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with id ${userId} not found`
      });
    }

    // Build where clause for sessions based on date range
    const sessionWhereClause = {};
    if (startDate || endDate) {
      sessionWhereClause.date = {};
      if (startDate) {
        sessionWhereClause.date[Op.gte] = startDate;
      }
      if (endDate) {
        sessionWhereClause.date[Op.lte] = endDate;
      }
    }

    const attendance = await Attendance.findAll({
      where: { userId },
      include: [
        {
          model: Session,
          where: sessionWhereClause,
          include: [
            { model: SessionType },
            { model: Batch }
          ]
        }
      ],
      order: [[{ model: Session }, 'date', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance status
// @route   PUT /api/attendance/:id
// @access  Private/Staff
exports.updateAttendance = async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    let attendance = await Attendance.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'role'] },
        { model: Session, include: [{ model: SessionType }, { model: Batch }] }
      ]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: `Attendance record with id ${req.params.id} not found`
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update attendance record
    attendance = await attendance.update({
      status,
      notes: notes !== undefined ? notes : attendance.notes,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    });

    // Fetch updated record with associations
    attendance = await Attendance.findByPk(attendance.id, {
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'role'] },
        { model: Session, include: [{ model: SessionType }, { model: Batch }] }
      ]
    });

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update attendance status
// @route   PUT /api/sessions/:sessionId/attendance
// @access  Private/Staff
exports.bulkUpdateAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { attendanceData } = req.body;

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'attendanceData must be a non-empty array'
      });
    }

    // Check if session exists
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    // Validate status values
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    for (const item of attendanceData) {
      if (!item.id || !item.status) {
        return res.status(400).json({
          success: false,
          message: 'Each attendance item must have id and status'
        });
      }

      if (!validStatuses.includes(item.status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
    }

    // Update attendance records in a transaction
    const now = new Date();
    const updates = [];

    for (const item of attendanceData) {
      const attendance = await Attendance.findOne({
        where: {
          id: item.id,
          sessionId
        }
      });

      if (attendance) {
        await attendance.update({
          status: item.status,
          notes: item.notes !== undefined ? item.notes : attendance.notes,
          verifiedBy: req.user.id,
          verifiedAt: now
        });

        updates.push(attendance.id);
      }
    }

    // Get updated attendance records
    const updatedAttendance = await Attendance.findAll({
      where: {
        id: { [Op.in]: updates }
      },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    res.status(200).json({
      success: true,
      count: updatedAttendance.length,
      data: updatedAttendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private/Admin
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const { startDate, endDate, batchId } = req.query;

    // Build where clause for sessions based on date range and batch
    const sessionWhereClause = {};
    if (startDate || endDate) {
      sessionWhereClause.date = {};
      if (startDate) {
        sessionWhereClause.date[Op.gte] = startDate;
      }
      if (endDate) {
        sessionWhereClause.date[Op.lte] = endDate;
      }
    }

    if (batchId) {
      sessionWhereClause.batchId = batchId;
    }

    // Get all sessions matching criteria
    const sessions = await Session.findAll({
      where: sessionWhereClause,
      attributes: ['id']
    });

    const sessionIds = sessions.map(session => session.id);

    if (sessionIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalSessions: 0,
          totalAttendanceRecords: 0,
          statusCounts: {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          },
          attendanceRate: 0
        }
      });
    }

    // Get attendance statistics
    const totalAttendanceRecords = await Attendance.count({
      where: {
        sessionId: { [Op.in]: sessionIds }
      }
    });

    // Count by status
    const presentCount = await Attendance.count({
      where: {
        sessionId: { [Op.in]: sessionIds },
        status: 'present'
      }
    });

    const absentCount = await Attendance.count({
      where: {
        sessionId: { [Op.in]: sessionIds },
        status: 'absent'
      }
    });

    const lateCount = await Attendance.count({
      where: {
        sessionId: { [Op.in]: sessionIds },
        status: 'late'
      }
    });

    const excusedCount = await Attendance.count({
      where: {
        sessionId: { [Op.in]: sessionIds },
        status: 'excused'
      }
    });

    // Calculate attendance rate (present + late) / total
    const attendanceRate = totalAttendanceRecords > 0 
      ? ((presentCount + lateCount) / totalAttendanceRecords) * 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalSessions: sessions.length,
        totalAttendanceRecords,
        statusCounts: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount
        },
        attendanceRate: parseFloat(attendanceRate.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create attendance records for a session
// @route   POST /api/sessions/:sessionId/attendance
// @access  Private/Staff
exports.createAttendanceRecords = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { userIds, defaultStatus } = req.body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }

    // Check if session exists
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    // Validate status if provided
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    const status = defaultStatus || 'absent'; // Default to absent if not specified
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check for existing attendance records
    const existingRecords = await Attendance.findAll({
      where: {
        sessionId,
        userId: { [Op.in]: userIds }
      }
    });

    // Filter out users who already have attendance records
    const existingUserIds = existingRecords.map(record => record.userId);
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All specified users already have attendance records for this session'
      });
    }

    // Create attendance records
    const attendanceRecords = newUserIds.map(userId => ({
      sessionId,
      userId,
      status,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    }));

    const createdRecords = await Attendance.bulkCreate(attendanceRecords);

    // Get created records with associations
    const records = await Attendance.findAll({
      where: {
        id: { [Op.in]: createdRecords.map(record => record.id) }
      },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'role'] },
        { model: Session, include: [{ model: SessionType }, { model: Batch }] }
      ]
    });

    res.status(201).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate attendance records for all users in a batch for a session
// @route   POST /api/sessions/:sessionId/generate-attendance
// @access  Private/Staff
exports.generateAttendanceForBatch = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { defaultStatus } = req.body;

    // Check if session exists
    const session = await Session.findByPk(sessionId, {
      include: [{ model: Batch }]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    if (!session.batchId) {
      return res.status(400).json({
        success: false,
        message: 'Session is not associated with any batch'
      });
    }

    // Validate status if provided
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    const status = defaultStatus || 'absent'; // Default to absent if not specified
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get all users in the batch with role 'santri'
    const users = await User.findAll({
      where: {
        batchId: session.batchId,
        role: 'santri'
      },
      attributes: ['id']
    });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No users found in batch ${session.batch.name}`
      });
    }

    // Check for existing attendance records
    const existingRecords = await Attendance.findAll({
      where: {
        sessionId,
        userId: { [Op.in]: users.map(user => user.id) }
      }
    });

    // Filter out users who already have attendance records
    const existingUserIds = existingRecords.map(record => record.userId);
    const newUsers = users.filter(user => !existingUserIds.includes(user.id));

    if (newUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All users in this batch already have attendance records for this session'
      });
    }

    // Create attendance records
    const attendanceRecords = newUsers.map(user => ({
      sessionId,
      userId: user.id,
      status,
      verifiedBy: req.user.id,
      verifiedAt: new Date()
    }));

    const createdRecords = await Attendance.bulkCreate(attendanceRecords);

    res.status(201).json({
      success: true,
      count: createdRecords.length,
      message: `Created ${createdRecords.length} attendance records for batch ${session.batch.name}`
    });
  } catch (error) {
    next(error);
  }
};

// Option A: Client-Side Filtering

// @desc    Get users for attendance with filters
// @route   GET /api/sessions/:sessionId/users-for-attendance
// @access  Private/Staff
exports.getUsersForAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { batchId, divisionId } = req.query;

    // Check if session exists
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    // Build where clause for users based on filters
    const userWhereClause = { role: 'santri' };
    
    // Apply batch filter (if not provided, use the session's batch)
    if (batchId) {
      userWhereClause.batchId = batchId;
    } else if (session.batchId) {
      userWhereClause.batchId = session.batchId;
    }
    
    // Apply division filter if provided
    if (divisionId) {
      userWhereClause.divisionId = divisionId;
    }

    // Get users based on filters
    const users = await User.findAll({
      where: userWhereClause,
      include: [
        { model: Batch },
        { model: Division },
        {
          model: Attendance,
          required: false,
          where: { sessionId },
          attributes: ['id', 'status', 'notes', 'verifiedAt']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create/update attendance with filters
// @route   POST /api/sessions/:sessionId/filtered-attendance
// @access  Private/Staff
exports.bulkCreateUpdateFilteredAttendance = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { userIds, status, notes } = req.body;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }

    // Check if session exists
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Session with id ${sessionId} not found`
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find existing attendance records for these users in this session
    const existingRecords = await Attendance.findAll({
      where: {
        sessionId,
        userId: { [Op.in]: userIds }
      }
    });

    const existingUserIds = existingRecords.map(record => record.userId);
    
    // Prepare arrays for updates and creates
    const recordsToUpdate = [];
    const recordsToCreate = [];
    
    // Process existing records for update
    existingRecords.forEach(record => {
      record.status = status;
      if (notes !== undefined) record.notes = notes;
      record.verifiedBy = req.user.id;
      record.verifiedAt = new Date();
      recordsToUpdate.push(record);
    });
    
    // Prepare new records for creation
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));
    newUserIds.forEach(userId => {
      recordsToCreate.push({
        sessionId,
        userId,
        status,
        notes,
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      });
    });

    // Execute updates and creates in a transaction
    const results = await sequelize.transaction(async (t) => {
      // Update existing records
      const updatePromises = recordsToUpdate.map(record => record.save({ transaction: t }));
      const updated = await Promise.all(updatePromises);
      
      // Create new records
      const created = recordsToCreate.length > 0 ? 
        await Attendance.bulkCreate(recordsToCreate, { transaction: t }) : [];
      
      return { updated, created };
    });

    res.status(200).json({
      success: true,
      message: `Updated ${results.updated.length} and created ${results.created.length} attendance records`,
      data: {
        updated: results.updated.length,
        created: results.created.length,
        total: results.updated.length + results.created.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed attendance reports with multiple filters
// @route   GET /api/attendance/reports
// @access  Private/Admin/Staff
exports.getAttendanceReports = async (req, res, next) => {
  try {
    const { startDate, endDate, batchId, divisionId, sessionTypeId } = req.query;

    // Build where clauses based on filters
    const sessionWhereClause = {};
    if (startDate || endDate) {
      sessionWhereClause.date = {};
      if (startDate) sessionWhereClause.date[Op.gte] = startDate;
      if (endDate) sessionWhereClause.date[Op.lte] = endDate;
    }
    if (batchId) sessionWhereClause.batchId = batchId;
    if (sessionTypeId) sessionWhereClause.sessionTypeId = sessionTypeId;

    const userWhereClause = { role: 'santri' };
    if (divisionId) userWhereClause.divisionId = divisionId;

    // Get all relevant sessions
    const sessions = await Session.findAll({
      where: sessionWhereClause,
      include: [
        { model: SessionType },
        { model: Batch }
      ],
      order: [['date', 'DESC']]
    });

    if (sessions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No sessions found matching the criteria',
        data: {
          sessions: [],
          statistics: {}
        }
      });
    }

    // Get all relevant users
    const users = await User.findAll({
      where: userWhereClause,
      include: [
        { model: Batch },
        { model: Division }
      ],
      order: [['name', 'ASC']]
    });

    // Get attendance records for these sessions and users
    const sessionIds = sessions.map(session => session.id);
    const userIds = users.map(user => user.id);

    const attendanceRecords = await Attendance.findAll({
      where: {
        sessionId: { [Op.in]: sessionIds },
        userId: { [Op.in]: userIds }
      }
    });

    // Calculate statistics
    const statistics = {
      totalSessions: sessions.length,
      totalUsers: users.length,
      totalRecords: attendanceRecords.length,
      byStatus: {
        present: attendanceRecords.filter(r => r.status === 'present').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
        late: attendanceRecords.filter(r => r.status === 'late').length,
        excused: attendanceRecords.filter(r => r.status === 'excused').length
      },
      byBatch: {},
      byDivision: {},
      bySessionType: {}
    };

    // Group statistics by batch
    const batchMap = {};
    sessions.forEach(session => {
      if (session.batch) {
        const batchId = session.batch.id;
        if (!batchMap[batchId]) {
          batchMap[batchId] = {
            name: session.batch.name,
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          };
        }
      }
    });

    // Group statistics by division
    const divisionMap = {};
    users.forEach(user => {
      if (user.division) {
        const divisionId = user.division.id;
        if (!divisionMap[divisionId]) {
          divisionMap[divisionId] = {
            name: user.division.name,
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          };
        }
      }
    });

    // Group statistics by session type
    const sessionTypeMap = {};
    sessions.forEach(session => {
      if (session.sessionType) {
        const typeId = session.sessionType.id;
        if (!sessionTypeMap[typeId]) {
          sessionTypeMap[typeId] = {
            name: session.sessionType.name,
            totalRecords: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0
          };
        }
      }
    });

    // Calculate statistics for each group
    attendanceRecords.forEach(record => {
      // Find the session and user for this record
      const session = sessions.find(s => s.id === record.sessionId);
      const user = users.find(u => u.id === record.userId);

      if (session && session.batch) {
        const batchId = session.batch.id;
        if (batchMap[batchId]) {
          batchMap[batchId].totalRecords++;
          batchMap[batchId][record.status]++;
        }
      }

      if (user && user.division) {
        const divisionId = user.division.id;
        if (divisionMap[divisionId]) {
          divisionMap[divisionId].totalRecords++;
          divisionMap[divisionId][record.status]++;
        }
      }

      if (session && session.sessionType) {
        const typeId = session.sessionType.id;
        if (sessionTypeMap[typeId]) {
          sessionTypeMap[typeId].totalRecords++;
          sessionTypeMap[typeId][record.status]++;
        }
      }
    });

    // Convert maps to arrays for the response
    statistics.byBatch = Object.values(batchMap);
    statistics.byDivision = Object.values(divisionMap);
    statistics.bySessionType = Object.values(sessionTypeMap);

    // Calculate attendance rates
    statistics.attendanceRate = statistics.totalRecords > 0 ?
      ((statistics.byStatus.present + statistics.byStatus.late) / statistics.totalRecords) * 100 : 0;

    statistics.byBatch.forEach(batch => {
      batch.attendanceRate = batch.totalRecords > 0 ?
        ((batch.present + batch.late) / batch.totalRecords) * 100 : 0;
    });

    statistics.byDivision.forEach(division => {
      division.attendanceRate = division.totalRecords > 0 ?
        ((division.present + division.late) / division.totalRecords) * 100 : 0;
    });

    statistics.bySessionType.forEach(type => {
      type.attendanceRate = type.totalRecords > 0 ?
        ((type.present + type.late) / type.totalRecords) * 100 : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          date: s.date,
          batchName: s.batch ? s.batch.name : null,
          sessionTypeName: s.sessionType ? s.sessionType.name : null
        })),
        statistics
      }
    });
  } catch (error) {
    next(error);
  }
};

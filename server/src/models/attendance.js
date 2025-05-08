'use strict';

module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    sessionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Sessions',
        key: 'id'
      },
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('present', 'late', 'absent', 'excused'),
      defaultValue: 'absent'
    },
    checkInTime: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    },
    verifiedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    verifiedAt: {
      type: DataTypes.DATE
    }
  }, {});
  
  Attendance.associate = function(models) {
    Attendance.belongsTo(models.Session, { foreignKey: 'sessionId' });
    Attendance.belongsTo(models.User, { foreignKey: 'userId' });
    Attendance.belongsTo(models.User, { foreignKey: 'verifiedBy', as: 'Verifier' });
  };
  
  return Attendance;
};
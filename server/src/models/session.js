'use strict';

module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    sessionTypeId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'SessionTypes',
        key: 'id'
      },
      allowNull: false
    },
    batchId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Batches',
        key: 'id'
      },
      allowNull: false
    },
    divisionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Divisions',
        key: 'id'
      },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in-progress', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    }
  }, {});
  
  Session.associate = function(models) {
    Session.belongsTo(models.SessionType, { foreignKey: 'sessionTypeId' });
    Session.belongsTo(models.Batch, { foreignKey: 'batchId' });
    Session.belongsTo(models.Division, { foreignKey: 'divisionId' });
    Session.hasMany(models.Attendance, { foreignKey: 'sessionId' });
  };
  
  return Session;
};
'use strict';

module.exports = (sequelize, DataTypes) => {
  const SessionType = sequelize.define('SessionType', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {});
  
  SessionType.associate = function(models) {
    SessionType.hasMany(models.Session, { foreignKey: 'sessionTypeId' });
  };
  
  return SessionType;
};
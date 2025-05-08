'use strict';

module.exports = (sequelize, DataTypes) => {
  const Division = sequelize.define('Division', {
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
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {});
  
  Division.associate = function(models) {
    Division.hasMany(models.User, { foreignKey: 'divisionId' });
    Division.hasMany(models.Session, { foreignKey: 'divisionId' });
  };
  
  return Division;
};
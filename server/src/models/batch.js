'use strict';

module.exports = (sequelize, DataTypes) => {
  const Batch = sequelize.define('Batch', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 2000,
        max: 2100
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {});
  
  Batch.associate = function(models) {
    Batch.hasMany(models.User, { foreignKey: 'batchId' });
    Batch.hasMany(models.Session, { foreignKey: 'batchId' });
  };
  
  return Batch;
};
'use strict';
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 100]
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'staff', 'santri'),
      defaultValue: 'santri'
    },
    batchId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Batches',
        key: 'id'
      }
    },
    divisionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Divisions',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });
  
  User.associate = function(models) {
    User.belongsTo(models.Batch, { foreignKey: 'batchId' });
    User.belongsTo(models.Division, { foreignKey: 'divisionId' });
    User.hasMany(models.Attendance, { foreignKey: 'userId' });
    User.hasMany(models.Attendance, { foreignKey: 'verifiedBy', as: 'VerifiedAttendances' });
  };
  
  User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };
  
  return User;
};
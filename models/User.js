// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    DOJ: { type: DataTypes.DATE, allowNull: true },
    Department: { type: DataTypes.STRING, allowNull: true },
    Manager: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('user', 'manager', 'admin'), defaultValue: 'user' },
    managerId: { type: DataTypes.UUID, allowNull: true } // Nullable for top-level Admins/Managers
});

// Self-referencing associations
User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });
User.hasMany(User, { as: 'reportees', foreignKey: 'managerId' });

module.exports = User;
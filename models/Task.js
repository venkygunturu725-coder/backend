const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 
const User = require('./User'); 

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending', 
    },
    priority: {
        type: DataTypes.STRING,
        defaultValue: 'medium',
    },
    dueDate: {
        type: DataTypes.DATE,
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    assignedTo: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users', 
            key: 'id'
        }
    },
    assignedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    tableName: 'tasks',
    timestamps: true,
});

// Relationships
Task.belongsTo(User, { as: 'Assignee', foreignKey: 'assignedTo' });
Task.belongsTo(User, { as: 'Assignor', foreignKey: 'assignedBy' });
User.hasMany(Task, { foreignKey: 'assignedTo' });

module.exports = Task;
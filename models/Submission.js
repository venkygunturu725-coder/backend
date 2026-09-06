// models/Submission.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Task = require('./Task')

const Submission = sequelize.define('Submission', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    concepts: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    files: {
        type: DataTypes.JSONB, 
        allowNull: true,
        // defaultValue: [],
    },
    submissionDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
    },
    adminComments: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }, 
    taskId: {
        type: DataTypes.UUID,
        allowNull: true, // Nullable so employees can still make proactive, unassigned submissions
        references: {
            model: 'tasks',
            key: 'id'
        }
    }
}, { timestamps: true });

// Declare Relationships
User.hasMany(Submission, { foreignKey: 'userId', as: 'submissions' });
Submission.belongsTo(User, { foreignKey: 'userId', as: 'employee' });

Submission.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Task.hasOne(Submission, { foreignKey: 'taskId', as: 'submission' });

module.exports = Submission;
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Reused from your submissionController setup
const streamUpload = (buffer, originalName = '') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'tasks', resource_type: 'auto' }, 
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    const readableStream = new Readable({ read() {} });
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

exports.createTask = async (req, res) => {
    try {
        const { title, description, priority, dueDate, assignedTo } = req.body;
        const assignedBy = req.user.id;

        let fileUrl = null;
        let fileName = null;

        // Using your memory buffer stream upload approach
        if (req.file) {
            const result = await streamUpload(req.file.buffer, req.file.originalname);
            fileUrl = result.secure_url;
            fileName = req.file.originalname;
        }

        const task = await Task.create({
            title, description, priority, dueDate, assignedTo, assignedBy, fileUrl, fileName,
        });

        // Real-time Notification using your existing setup
        const manager = await User.findByPk(assignedBy);
        await Notification.create({
            userId: assignedTo,
            message: `${manager.name} assigned you a new task: ${title}`
        });

        if (req.io) {
            req.io.to(`user_${assignedTo}`).emit('new_task', task);
        }

        res.status(201).json({ message: "Task assigned successfully", task });
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Internal server error while creating task." });
    }
};

exports.getTeamTasks = async (req, res) => {
    try {
        const managerId = req.user.id;
        const tasks = await Task.findAll({
            where: { assignedBy: managerId },
            include: [{ model: User, as: 'Assignee', attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve team tasks." });
    }
};

exports.getMyTasks = async (req, res) => {
    try {
        const employeeId = req.user.id;
        const tasks = await Task.findAll({
            where: { assignedTo: employeeId },
            include: [{ model: User, as: 'Assignor', attributes: ['id', 'name', 'email'] }],
            order: [['dueDate', 'ASC']]
        });
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve your tasks." });
    }
};

// PUT /api/tasks/:id/status
exports.updateTaskStatus = async (req, res) => {
    try {
        const taskId = req.params.id;
        const { status } = req.body;
        const userId = req.user.id;

        // 1. Find the task
        const task = await Task.findByPk(taskId);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // 2. Security Check: Ensure the user updating it is the assignee 
        // (Managers/Admins bypass this so they can manually update tasks if needed)
        if (task.assignedTo !== userId && req.user.role === 'user') {
            return res.status(403).json({ message: "You are not authorized to update this task." });
        }

        // 3. Update and save
        task.status = status;
        await task.save();

        // 4. Real-time broadcast to the Manager
        if (req.io && task.assignedBy) {
            req.io.to(`user_${task.assignedBy}`).emit('task_status_updated', {
                taskId: task.id,
                newStatus: status,
                title: task.title
            });
            // Optional: You could also save a record in the Notification table here
        }

        res.status(200).json({ message: "Task status updated successfully", task });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Internal server error while updating task." });
    }
};
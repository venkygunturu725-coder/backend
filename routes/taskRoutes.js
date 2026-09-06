const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { verifyToken } = require('../middleware/authMiddleware'); 
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Manager assigns a task
router.post('/', verifyToken, upload.single('taskFile'), taskController.createTask);

// Manager fetches tasks they have assigned
router.get('/team', verifyToken, taskController.getTeamTasks);

// Employee fetches tasks assigned to them
router.get('/me', verifyToken, taskController.getMyTasks);

// Employee updtaes task status
router.put('/:id/status', verifyToken, taskController.updateTaskStatus);

module.exports = router;
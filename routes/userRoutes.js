const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, userController.getAllUsers);


router.get('/profile', verifyToken, userController.getUserProfile);

router.get('/admin', verifyToken, requireRole('admin'), userController.getAdminDashboard);

router.get('/managers', verifyToken, requireRole('admin'), userController.getManagerDashboard);

router.get('/me', verifyToken, userController.getCurrentUser);

router.get('/:id', verifyToken, userController.getTeamMembers);

module.exports = router;
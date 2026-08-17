const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification'); // Ensure casing matches your file name
const { verifyToken } = require('../middleware/authMiddleware'); // Import your JWT middleware

// GET: Fetch the latest 50 notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id, isRead: false }, // Fetch only unread notifications
            order: [['createdAt', 'DESC']], 
            limit: 50 
        });
        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
});

// PUT: Mark all unread notifications as read for the logged-in user
router.put('/mark-read', verifyToken, async (req, res) => {
    try {
        await Notification.update(
            { isRead: true },
            { 
                where: { 
                    userId: req.user.id, 
                    isRead: false 
                } 
            }
        );
        res.status(200).json({ message: 'Notifications marked as read successfully' });
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        res.status(500).json({ message: 'Server error updating notifications' });
    }
});

module.exports = router;
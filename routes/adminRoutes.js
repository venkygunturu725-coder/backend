const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

/**
 * @swagger
 * /api/admin/provision-employee:
 *   post:
 *     summary: Provision a new employee (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, manager, admin]
 *               managerId:
 *                 type: string
 *               DOJ:
 *                 type: string
 *                 format: date
 *               Department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee provisioned successfully
 *       403:
 *         description: Access denied
 */

// Only admins can create new employees
router.post(
    '/provision-employee', 
    verifyToken, 
    requireRole('admin'), 
    adminController.provisionEmployee
);

router.delete(
    '/employees/:id',
    verifyToken,
    requireRole('admin'),
    adminController.deleteEmployee
);

router.put(
    '/employees/:id',
    verifyToken,
    requireRole('admin'),
    adminController.
    updateEmployee
);

module.exports = router;
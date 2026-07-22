const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware'); // Your existing middleware
const upload = require('../utils/uploadConfig');
const submissionController = require('../controllers/submissionController');

router.delete(
    '/deleteRecord/:id',
    verifyToken,
    // requireRole(['user', 'employee']),
    submissionController.deleteSubmission
);

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Submit new work (User only)
 *     tags: [Submissions]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               concepts:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Work submitted successfully
 */

// User routes
router.post(
    '/', 
    verifyToken, 
    requireRole('user'), 
    upload.array('files', 5), // Allow up to 5 files
    submissionController.submitWork
);

router.get(
    '/my-submissions', 
    verifyToken, 
    // requireRole('user'), 
    submissionController.getMySubmissions
);

// Admin routes
router.get(
    '/team', 
    verifyToken, 
    requireRole('manager'), 
    submissionController.getAllSubmissions
);

/**
 * @swagger
 * /api/submissions/{id}/review:
 *   put:
 *     summary: Review a submission (Manager only)
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, pending]
 *               adminComments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission reviewed successfully
 */

router.put(
    '/:id/review', 
    verifyToken, 
    requireRole('manager'), 
    submissionController.reviewSubmission
);

router.put(
    '/:id',
    verifyToken,
    requireRole('user' || 'employee'),
    upload.array('files', 5), 
    submissionController.updateSubmission

);

module.exports = router;
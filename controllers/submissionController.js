const Submission = require('../models/Submission');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('../utils/emailService');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const Task = require('../models/Task');

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim(),
};

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  throw new Error('Missing Cloudinary environment variables');
}

cloudinary.config(cloudinaryConfig);

/**
 * Helper function to upload a buffer stream to Cloudinary
 * Returns a Promise that resolves with the Cloudinary response
 */
const streamUpload = (buffer, originalName = '') => {
  return new Promise((resolve, reject) => {
    const isCodeFile = originalName.endsWith('.js') || originalName.endsWith('.jsx');
    
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'submissions',
        resource_type: isCodeFile ? 'raw' : 'auto'
      }, 
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          console.error("CLOUDINARY REJECTION REASON:", JSON.stringify(error, null, 2));
          reject(error);
        }
      }
    );

    // Added empty read() method object to prevent instantiation crash
    const readableStream = new Readable({
      read() {} 
    });
    
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(stream);
  });
};

exports.submitWork = async (req, res) => {
    try {
        const { title, concepts, taskId } = req.body;
        const userId = req.user.id; 
        
        let fileData = []; 

        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(async (file) => {
                const result = await streamUpload(file.buffer, file.originalname); 
                return {
                    url: result.secure_url,
                    name: file.originalname
                }
            });
            fileData = await Promise.all(uploadPromises);
        }

        // Create the submission
        const submission = await Submission.create({
            title,
            concepts,
            files: fileData, 
            userId, 
            taskId: taskId || null, 
        });

        if (taskId) {
            await Task.update(
                { status: 'Completed' },
                { where: { id: taskId } }
            ); 
        }

        // Fetch the User to get their managerId, name, and email
        const user = await User.findByPk(userId);

        // Emit to the MANAGER'S room
        if (req.io && user && user.managerId) {

            await Notification.create({
                userId: user.managerId,
                message: `${user.name} submitted a new project: ${submission.title}`
            });

            const newSubmissionPayload = {
                ...submission.toJSON(), 
                employee: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            };

            const managerRoom = `user_${user.managerId}`;
            
            req.io.to(managerRoom).emit('new_submission', newSubmissionPayload);
            console.log(`[SOCKET] Broadcasted new submission to Manager room: ${managerRoom}`);
        }

        res.status(201).json({ message: 'Work submitted successfully', submission });
    } catch (error) {
        console.error("Submission Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// USER: Get my submissions
exports.getMySubmissions = async (req, res) => {
    try {
        const userId = req.user.id;
        const submissions = await Submission.findAll({
            where: { userId },
            include: [{
                model: Task,
                as: 'task',
                attributes: ['id', 'title', 'status']
            }],
            order: [['createdAt', 'DESC']]
        });

        const user = await User.findByPk(userId);

        res.status(200).json({
            submissions,
            userFullName: user.email 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all submissions
exports.getAllSubmissions = async (req, res) => {
    try {
        const managerId = req.user.id; 
        
        const submissions = await Submission.findAll({
            include: [{ 
                model: User, 
                as: 'employee', 
                attributes: ['email', 'name'], 
                where: { managerId: managerId } 
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(submissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// MANAGER/ADMIN: Review Submission
// exports.reviewSubmission = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status, adminComments } = req.body;

//         const submission = await Submission.findByPk(id, {
//             include: [{ model: User, as: 'employee' }]
//         });

//         if (!submission) return res.status(404).json({ message: 'Submission not found' });

//         submission.status = status;
//         submission.adminComments = adminComments;
//         await submission.save();

//         // Fetch the manager performing the review to add them to the CC
//         const manager = await User.findByPk(req.user.id);

//         const subject = status === 'approved' ? 'Work Approved' : 'Work Rejected';
//         const emailBody = `Your submitted work "${submission.title}" has been ${status}.\n\nComments:\n${adminComments}`;
        
//         // Send email to Employee (TO), and Manager (CC)
//         // await sendMail(submission.employee.email, subject, emailBody, manager.email);

//         res.status(200).json({ message: `Submission ${status} successfully`, submission });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };
// submissionController.js

exports.reviewSubmission = async (req, res) => {
    try {
        console.log("request parameters:", req.params);
        const { id } = req.params;
        const { status, adminComments } = req.body;

        const submission = await Submission.findByPk(id, {
            include: [{ model: User, as: 'employee' }]
        });

        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        submission.status = status;
        submission.adminComments = adminComments;
        await submission.save();

        // --- REAL-TIME BROADCAST ---
        // Emit an event named 'submission_updated' containing the new data.
        // We broadcast to the specific room of the user who owns the submission.

        await Notification.create({
            userId: submission.employee.id,
            message: `Your submission "${submission.title}" was ${status.toUpperCase()}.`
        });

        if (req.io) {
            req.io.to(`user_${submission.userId}`).emit('submission_updated', {
                id: submission.id,
                status: submission.status,
                adminComments: submission.adminComments,
                title: submission.title,
            });
            console.log(`Broadcasted update for submission ${id} to user_${submission.userId}`);
        }

        res.status(200).json({ message: `Submission ${status} successfully`, submission });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { title, concepts } = req.body;
    const submission = await Submission.findByPk(submissionId);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const updateData = {
      title: title ?? submission.title,         
      concepts: concepts ?? submission.concepts, 
    };

    // Handle file updates if new files were uploaded
    if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map(async (file) => {
            const result = await streamUpload(file.buffer, file.originalname);
            
            return {
                url: result.secure_url,
                name: file.originalname
            };
        });

        const newFileData = await Promise.all(uploadPromises);
        
        updateData.files = newFileData; 
    }

    await submission.update(updateData);

    return res.status(200).json({ 
      message: 'Submission updated successfully', 
      submission 
    });

  } catch (error) {
    console.error("Error updating submission:", error);
    return res.status(500).json({ message: 'Server error while updating submission', error: error.message });
  }
};

exports.deleteSubmission = async (req, res) => {
    try {

        console.log("Hi")
        const submissionId = req.params.id;
        console.log("Attempting to delete submission with ID:", submissionId);
        const submission = await Submission.findByPk(submissionId);
        console.log("Fetched submission for deletion:", submission);
        
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        await submission.destroy();
        return res.status(200).json({ message: 'Submission deleted successfully' });
    } catch (error) {
        console.error("Error deleting submission:", error);
        return res.status(500).json({ message: 'Server error while deleting submission' });
    }
};

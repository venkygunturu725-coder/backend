const Submission = require('../models/Submission');
const User = require('../models/User');
const { sendMail } = require('../utils/emailService');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

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
        const { title, concepts } = req.body;
        const userId = req.user.id; 
        
        let fileUrls = [];
        console.log("Title: ", title);

        // Check if files exist in the request
        if (req.files && req.files.length > 0) {
            // FIXED: Passing file.originalname so streamUpload knows how to handle the extension
            const uploadPromises = req.files.map(file => streamUpload(file.buffer, file.originalname));
            
            // Wait for all uploads to finish concurrently
            const uploadResults = await Promise.all(uploadPromises);
            
            // Extract the secure URLs from the results
            fileUrls = uploadResults.map(result => result.secure_url);
        }

        // Create the submission using the array of Cloudinary URLs
        const submission = await Submission.create({
            title,
            concepts,
            files: fileUrls, 
            userId 
        });

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
exports.reviewSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminComments } = req.body;

        const submission = await Submission.findByPk(id, {
            include: [{ model: User, as: 'employee' }]
        });

        if (!submission) return res.status(404).json({ message: 'Submission not found' });

        submission.status = status;
        submission.adminComments = adminComments;
        await submission.save();

        // Fetch the manager performing the review to add them to the CC
        const manager = await User.findByPk(req.user.id);

        const subject = status === 'approved' ? 'Work Approved' : 'Work Rejected';
        const emailBody = `Your submitted work "${submission.title}" has been ${status}.\n\nComments:\n${adminComments}`;
        
        // Send email to Employee (TO), and Manager (CC)
        // await sendMail(submission.employee.email, subject, emailBody, manager.email);

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
      title: title ?? submission.title,         // Pro Tip: Changed to Nullish coalescing 
      concepts: concepts ?? submission.concepts, // to support empty string overrides safely
    };

    // Handle file updates if new files were uploaded
    if (req.files && req.files.length > 0) {
        // FIXED: Passing file.originalname for file extension checking during updates
        const uploadPromises = req.files.map(file => streamUpload(file.buffer, file.originalname));
        const uploadResults = await Promise.all(uploadPromises);
        const newFileUrls = uploadResults.map(result => result.secure_url);
        
        updateData.files = newFileUrls; 
    }

    await submission.update(updateData);

    return res.status(200).json({ 
      message: 'Submission updated successfully', 
      submission 
    });

  } catch (error) {
    console.error("Error updating submission:", error);
    // OPTIMIZATION: Passed error message to client for faster debugging
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

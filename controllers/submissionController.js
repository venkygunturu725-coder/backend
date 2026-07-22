const Submission = require('../models/Submission');
const User = require('../models/User');
const { sendMail } = require('../utils/emailService');

// USER: Submit Work
exports.submitWork = async (req, res) => {
    try {
        const { title, concepts } = req.body;
        const userId = req.user.id; 
        
        // Ensure files exist before mapping
        const files = req.files ? req.files.map(file => file.path) : [];

        const submission = await Submission.create({
            title,
            concepts,
            files,
            userId 
        });

        // Fetch the user and their manager to dynamically assign emails
        const user = await User.findByPk(userId);
        let managerEmail = ''; 
        
        if (user.managerId) {
            const manager = await User.findByPk(user.managerId);
            if (manager) managerEmail = manager.email;
        }

        const emailBody = `Employee ${user.email} has submitted work for review.\n\nWork Title: ${title}`;
        
        // Send email to Manager (TO), and Employee (CC)
        await sendMail(managerEmail, 'New Work Submission', emailBody, user.email);

        res.status(201).json({ message: 'Work submitted successfully', submission });
    } catch (error) {
        console.error(error);
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
        await sendMail(submission.employee.email, subject, emailBody, manager.email);

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
    const files = req.files;
    const submission = await Submission.findByPk(submissionId);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Prepare the updated data
    const updateData = {
      title: title || submission.title,
      concepts: concepts || submission.concepts,
    };

    // Handle file updates if new files were uploaded
    if (files && files.length > 0) {
      // Changed from file.filename to file.path to match your POST route
      const filePaths = files.map(file => file.path); 
      updateData.files = filePaths; 
    }

    // Update the database record
    await submission.update(updateData);

    // Send success response back to React
    return res.status(200).json({ 
      message: 'Submission updated successfully', 
      submission 
    });

  } catch (error) {
    console.error("Error updating submission:", error);
    return res.status(500).json({ message: 'Server error while updating submission' });
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

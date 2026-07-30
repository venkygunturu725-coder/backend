const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // Built-in Node module for random strings
const { sendMail } = require('../utils/emailService');
const { extractNameFromEmail } = require('../utils/nameFormatter');
const dotenv = require('dotenv');
dotenv.config();

exports.provisionEmployee = async (req, res) => {
    try {
        const { name,email, role, managerId, DOJ, Department, Manager } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists in the system.' });
        }

        // Extract Name from Email
        const generatedName = extractNameFromEmail(email);

        // Generate a temporary random password
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create the User in the self-referencing table
        const newUser = await User.create({
            name: name,
            email: email,
            password: hashedPassword,
            role: role || 'user',
            managerId: managerId || null,
            DOJ: DOJ || null,
            Department: Department || null,
            Manager: Manager || null
        });

        // Send Welcome Email to the new employee
        const loginUrl = process.env.FRONTEND_PASS_RESET_URL || 'http://localhost:5173/'.replace(/\/$/, '');
        const resetUrl = `${loginUrl}?email=${encodeURIComponent(email)}`; 
        const emailBody = `
            Hello ${generatedName},
            
            An administrator has set up your workspace account. 
            
            Your login credentials are:
            Email: ${email}
            Temporary Password: ${tempPassword}
            
            Please log in at ${resetUrl} and change your password immediately.
        `;

        try {
            await sendMail(email, 'Welcome to the Team - Account Provisioned', emailBody);
        } catch (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({
                message: 'Employee was created, but the welcome email could not be sent.',
                user: { id: newUser.id, name: newUser.name, email: newUser.email },
                emailError: error.message
            });
        }

        res.status(201).json({ 
            message: 'Employee provisioned successfully', 
            user: { id: newUser.id, name: newUser.name, email: newUser.email } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const userId =  req.params.id;
        console.log("Fetching current user with ID:", userId);
        const deleteUser = await User.destroy({
            where: { id: userId }
        });

        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

exports.updateEmployee = async (req, res) => {
    try {
        const userId = req.params.id;
        const { role, managerId, DOJ, Department, Manager } = req.body;

        const updatedUser = await User.update({
           
            role: role,
            managerId: managerId,
            DOJ: DOJ,
            Department: Department,
            Manager: Manager
        }, {
            where: { id: userId }
        });

        res.status(200).json({ message: 'Employee updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

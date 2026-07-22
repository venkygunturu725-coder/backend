const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'outlook', 
    auth: {
        user: process.env.OUTLOOK_USER,
        pass: process.env.OUTLOOK_PASS
    }
});

/**
 * Sends an email with optional CC
 * @param {string} to - Primary recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email body text
 * @param {string} [cc] - Optional CC recipient email
 */
exports.sendMail = async (to, subject, text, cc = null) => {
    try {
        const mailOptions = {
            from: process.env.OUTLOOK_USER,
            to: to,
            subject: subject,
            text: text,
            cc: cc || undefined
        };

        // If a CC email is provided, add it to the mail options
        if (cc) {
            mailOptions.cc = cc;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.response}`);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${to}:`, error);
        throw error;
    }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await User.create({
            email,
            password: hashedPassword,
            role: role || 'user' 
        });

        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt:', { email, password });

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('password: ', password, 'hashed: ', user.password, 'isMatch: ', isMatch);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate short-lived Access Token
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        // Generate long-lived Refresh Token
        const refreshToken = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // 3. Set HttpOnly Cookie for the Refresh Token
        // Dynamic Cookie Policy for Cross-Origin support
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Prevents JavaScript access (mitigates XSS)
            secure: isProduction, 
            sameSite: isProduction ? 'none' : 'lax', 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        // 4. Send only the Access Token to the frontend
        res.status(200).json({
            message: 'Login successful',
            token: accessToken,
            user: { id: user.id, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// --- New Controller Methods for Refresh and Logout ---

exports.refreshToken = (req, res) => {
    // Read from cookies using cookie-parser
    const token = req.cookies.refreshToken;

    if (!token) return res.status(401).json({ message: 'Refresh token required' });

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Invalid refresh token' });

        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role }, 
            process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        res.json({ accessToken: newAccessToken });
    });
};

exports.logout = (req, res) => {
    // Clear the HttpOnly cookie upon logout
    // clearCookie parameters must perfectly match the cookie creation parameters
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out successfully' });
};
const jwt = require('jsonwebtoken');

// Verify JWT Token
exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // console.log('Authorization Header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        // This 401 error is exactly what triggers your React frontend to attempt a silent refresh!
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

// Role-based Access Control (Remains completely unchanged)
exports.requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ message: `Access denied. Requires ${role} privileges.` });
        }
        next();
    };
};
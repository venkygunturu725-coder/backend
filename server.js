require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const notification = require('./models/Notification');
const bcrypt = require('bcryptjs');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const taskRoutes = require('./routes/taskRoutes');


const app = express();
const server = http.createServer(app);

// 1. FIX: Initialize Socket.io with proper CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? 'https://knowlwdge-management-portal.vercel.app' 
            : 'http://localhost:5173',
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://knowlwdge-management-portal.vercel.app' 
        : 'http://localhost:5173',
    credentials: true // This is required for cookies/refresh tokens to work
}));
app.use(express.json()); 
app.use(cookieParser());

// 2. CRITICAL FIX: Attach 'io' to the req object so controllers can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});

// 3. CRITICAL FIX: Add the socket listener so users can actually join rooms
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', require('./routes/notificationRoutes')); 
app.use('/api/tasks', taskRoutes);

const PORT = process.env.PORT || 3000;

// 4. CRITICAL FIX: Use server.listen() instead of app.listen() in both environments
if (process.env.NODE_ENV !== 'production') {
    // LOCAL DEVELOPMENT
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('PostgreSQL Database connected successfully.');
            server.listen(PORT, () => {
                console.log(`Local Server (HTTP & WS) is running on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
        });
} else {
    // PRODUCTION (RENDER/RAILWAY)
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('Database connection established in Production.');
            server.listen(PORT, () => {
                console.log(`Production Server (HTTP & WS) is running on port ${PORT}`);
            });
        })
        .catch(err => {
            console.error('Unable to connect to the database:', err);
        });
}

module.exports = server;
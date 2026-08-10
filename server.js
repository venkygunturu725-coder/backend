// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const sequelize = require('./config/database');
// const path = require('path');
// const Submission = require('./models/Submission');
// const http = require('http');
// const { Server } = require('socket.io');
// // const swaggerUi = require('swagger-ui-express');
// // const swaggerSpec = require('./config/swagger');

// // Routes
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const submissionRoutes = require('./routes/submissionRoutes');
// const adminRoutes = require('./routes/adminRoutes');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// // Middleware
// app.use(cors());
// // app.use(cors({
// //     origin: 'https://knowlwdge-management-portal.vercel.app', 
// //     credentials: true
// // })); 
// app.use(express.json()); 

// // Route Middlewares
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/api/submissions', submissionRoutes);
// app.use('/api/admin', adminRoutes);

// // Swagger setup 
// // app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// const PORT = process.env.PORT || 3000;

// // Check if we are running in Vercel (production) or locally
// if (process.env.NODE_ENV !== 'production') {
//     // LOCAL DEVELOPMENT: Sync database schemas and start persistent server
//     sequelize.sync({ alter: true })
//         .then(() => {
//             console.log('PostgreSQL Database connected successfully.');
//             app.listen(PORT, () => {
//                 console.log(`Server is running on port ${PORT}`);
//             });
//         })
//         .catch((err) => {
//             console.error('Unable to connect to the database:', err);
//         });
// } else {
//     // VERCEL PRODUCTION: Just authenticate the database connection, do NOT run app.listen()
//     sequelize.authenticate()
//         .then(() => {
//             console.log('Database connection has been established successfully on Vercel.');
//         })
//         .catch(err => {
//             console.error('Unable to connect to the database:', err);
//         });
// }

// // CRITICAL FOR VERCEL: Export the app
// module.exports = app;


// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const path = require('path');
const http = require('http'); // 1. Import Node's http module
const { Server } = require('socket.io'); // 2. Import Socket.io

const app = express();
const server = http.createServer(app); // 3. Wrap Express app in HTTP server

// 4. Initialize Socket.io with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? 'https://your-frontend-domain.vercel.app' // Update this for production
            : 'http://localhost:5173', // Vite default port
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.json()); 

// 5. Attach 'io' to the req object so controllers can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Route Middlewares
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 3000;

// 6. Basic Socket Connection Handler
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    // Optional: Allow clients to join a specific "room" based on their User ID
    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`Socket ${socket.id} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

if (process.env.NODE_ENV !== 'production') {
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('PostgreSQL Database connected successfully.');
            // 7. IMPORTANT: Use server.listen instead of app.listen
            server.listen(PORT, () => {
                console.log(`Server (HTTP & WS) is running on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
        });
} else {
    sequelize.authenticate()
        .then(() => {
            console.log('Database connection has been established successfully on Vercel.');
        })
        .catch(err => {
            console.error('Unable to connect to the database:', err);
        });
}

module.exports = server; // Export the wrapped server
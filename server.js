const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');
const path = require('path');
const Submission = require('./models/Submission');
// const swaggerUi = require('swagger-ui-express');
// const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: 'https://knowlwdge-management-portal.vercel.app', 
    credentials: true
})); 
app.use(express.json()); 

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);

// Swagger setup 
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;

// Check if we are running in Vercel (production) or locally
if (process.env.NODE_ENV !== 'production') {
    // LOCAL DEVELOPMENT: Sync database schemas and start persistent server
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('PostgreSQL Database connected successfully.');
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error('Unable to connect to the database:', err);
        });
} else {
    // VERCEL PRODUCTION: Just authenticate the database connection, do NOT run app.listen()
    sequelize.authenticate()
        .then(() => {
            console.log('Database connection has been established successfully on Vercel.');
        })
        .catch(err => {
            console.error('Unable to connect to the database:', err);
        });
}

// CRITICAL FOR VERCEL: Export the app
module.exports = app;
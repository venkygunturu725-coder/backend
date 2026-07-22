// seedAdmin.js
const bcrypt = require('bcrypt');
const User = require('./models/User'); // Adjust path to your User model
const sequelize = require('./config/database'); // Adjust path to your DB config

const seedFirstAdmin = async () => {
    try {
        // Connect to the database
        await sequelize.authenticate();
        console.log('Database connected...');

        // 1. Check if any users exist to prevent accidental re-runs
        const userCount = await User.count();
        // if (userCount > 0) {
        //     console.log('Users already exist in the database. Aborting seed.');
        //     process.exit(0);
        // }

        // 2. Hash a secure password for the first admin
        const hashedPassword = await bcrypt.hash('Vg121525%', 10);

        // 3. Force-create the admin user
        const superAdmin = await User.create({
            name: 'venkateswarlu',
            email: 'venkateswarlu@gain-insights.com',
            password: hashedPassword,
            role: 'admin',
            managerId: null // Top level, no manager
        });

        console.log(`Success! First admin created with email: ${superAdmin.email}`);
        process.exit(0);

    } catch (error) {
        console.error('Failed to seed admin:', error);
        process.exit(1);
    }
};

seedFirstAdmin();
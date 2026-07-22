const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
    try {
        const managerId = req.user.id;
        const users = await User.findAll({
            // where: {managerId: managerId},
            attributes: ['id', 'name', 'email', 'role', 'DOJ', 'Department', 'Manager']
        });
        console.log("Fetched users:", users);
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error while fetching users" });
    }
};

exports.getUserProfile = (req, res) => {
    res.status(200).json({ message: 'Welcome to your profile!', user: req.user });
};

exports.getAdminDashboard = (req, res) => {
    res.status(200).json({ message: 'Welcome to the Admin Dashboard!', admin: req.user });
};

exports.getManagerDashboard = async (req, res) => {
    try {
        // Fetch all users who have the role of 'manager'
        const managers = await User.findAll({
            where: { role: 'manager' },
            attributes: [ 'id', 'name', 'email' ] 
        });

        res.status(200).json(managers);
    } catch (error) {
        console.error("Error fetching managers:", error);
        res.status(500).json({ message: "Server error while fetching managers" });
    }
};

exports.getCurrentUser = async (req, res) => {
        console.log("Hi")
        const userId = req.user.id;
        console.log("Fetching current user with ID:", userId);
        const user = await User.findOne({
            where: { id: userId },
            attributes: ['name', 'email', 'role'] 
        });
        console.log("Current user fetched:", user);
        res.status(200).json({ user });
    
}

exports.getTeamMembers = async (req, res) => {
    try {
        const managerId = req.user.id;
        const users = await User.findAll({
            where: { managerId: managerId},
            attributes: ['id', 'name', 'email']
        })
        res.status(200).json({users})

    } catch (err) {
        console.error(err);
    }
}
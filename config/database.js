const { Sequelize } = require('sequelize');
const pg = require('pg');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false 
        }
    },
    pool: {
        max: 3,
        min: 0,
        idle: 10000,
        acquire: 30000
    }
});

module.exports = sequelize;
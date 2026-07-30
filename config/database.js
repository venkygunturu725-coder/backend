// const { Sequelize } = require('sequelize');
// const pg = require('pg');

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//     dialect: 'postgres',
//     dialectModule: pg,
//     dialectOptions: {
//         ssl: {
//             require: true,
//             rejectUnauthorized: false 
//         }
//     },
//     pool: {
//         max: 3,
//         min: 0,
//         idle: 10000,
//         acquire: 30000
//     }
// });

// module.exports = sequelize;




const pg = require('pg');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    dialectModule: pg, 
    port: process.env.DB_PORT || 5432,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

module.exports = sequelize;
require('dotenv').config();
const { Sequelize } = require("sequelize");

module.exports = new Sequelize('ecommercenodejs', process.env.DB_USER, Buffer.from(process.env.DB_PASSWORD, "base64").toString('ascii'), {
    // the sql dialect of the database
    // currently supported: 'mysql', 'sqlite', 'postgres', 'mssql'
    dialect: 'postgres',

    // logging: false,
  
    // custom port; default: dialect default
    port: 5432,
  
    // pool configuration used to pool database connections
    pool: {
      max: 50,
      idle: 30000,
      acquire: 60000,
    },
  })
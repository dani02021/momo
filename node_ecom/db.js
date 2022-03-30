require('dotenv').config();
const { Sequelize } = require("sequelize");

let uri = process.env.DB_URI;

let options = {
  // the sql dialect of the database
  // currently supported: 'mysql', 'sqlite', 'postgres', 'mssql'
  dialect: 'postgres',

  // logging: false,

  // custom port; default: dialect default
  port: 5432,

  // pool configuration used to pool database connections
  pool: {
    max: 150,
    idle: 30000,
    acquire: 60000,
  },
}

if (process.env.HEROKU_DB_URI) 
{
  uri = process.env.HEROKU_DB_URI;

  options += {
    dialectOptions: {
      ssl: {
        require:  true,
        rejectUnauthorized: false // <<<<<<< YOU NEED THIS
      }
    },
  };
}

module.exports = new Sequelize(uri, options);
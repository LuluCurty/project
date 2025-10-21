require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'eletricca_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'eletricca',
    password: process.env.DB_PASSWORD || 'eletrO@8002',
    port: process.env.DB_PORT || 5432,
});

module.exports = pool;
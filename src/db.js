require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'monitoramento_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'monitoramento_jornada',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2' }
    : undefined,
  decimalNumbers: true
});

module.exports = pool;

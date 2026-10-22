const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'monitoramento_jornada',

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,

  charset: 'utf8mb4',
  timezone: 'local',

  // Ativa TLS para conectar ao TiDB Cloud
  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2' }
    : undefined,

  decimalNumbers: true
});

async function verificarBanco() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  verificarBanco
};
require('dotenv').config();

const app = require('./app');
const pool = require('./db');

const porta = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'ERRO: configure JWT_SECRET com pelo menos 32 caracteres.'
  );
  process.exit(1);
}

async function verificarBanco() {
  await pool.query('SELECT 1');
}

async function iniciarServidor() {
  try {
    await verificarBanco();
    console.log('Conexão com MySQL/MariaDB confirmada.');
  } catch (error) {
    console.warn(
      'Aviso: não foi possível conectar ao banco de dados.'
    );
    console.warn(`Detalhe: ${error.message}`);
  }

  app.listen(porta, '0.0.0.0', () => {
    console.log(`API ativa na porta ${porta}.`);
    console.log(`Teste local: http://localhost:${porta}/api/health`);
  });
}

iniciarServidor();
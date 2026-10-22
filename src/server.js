require('dotenv').config();

const app = require('./app');
const { verificarBanco } = require('./config/database');

const porta = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('ERRO: configure JWT_SECRET no arquivo .env com pelo menos 32 caracteres.');
  process.exit(1);
}

async function iniciarServidor() {
  try {
    await verificarBanco();
    console.log('Conexão com MariaDB confirmada.');
  } catch (error) {
    console.warn('Aviso: não foi possível conectar ao MariaDB na inicialização. A API iniciará, mas /api/health retornará 503 até a conexão ser corrigida.');
    console.warn(`Detalhe: ${error.message}`);
  }

  app.listen(porta, '0.0.0.0', () => {
    console.log(`Monitoramento de Jornada API ativa na porta ${porta}.`);
    console.log(`Teste local: http://localhost:${porta}/api/health`);
    console.log('Para o emulador Android, use http://10.0.2.2:' + porta + '.');
  });
}

iniciarServidor();

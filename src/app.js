const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth.routes');
const jornadasRoutes = require('./routes/jornadas.routes');
const { verificarBanco } = require('./config/database');

const app = express();

app.disable('x-powered-by');
app.use(helmet());

const origens = (process.env.CORS_ORIGIN || '*').split(',').map((origem) => origem.trim());
app.use(cors({
  origin: origens.includes('*') ? true : origens,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '200kb' }));

const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente mais tarde.' }
});
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de autenticação. Aguarde e tente novamente.' }
});
app.use('/api', limiterGeral);

app.get('/', (req, res) => {
  res.json({ nome: 'Monitoramento de Jornada API', status: 'online', documentacao: 'Consulte README.md e api.http no projeto.' });
});

app.get('/api/health', async (req, res) => {
  try {
    await verificarBanco();
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(503).json({ status: 'error', database: 'disconnected', mensagem: 'API iniciou, mas não conseguiu acessar o banco. Confira o arquivo .env e se o MariaDB está ligado.' });
  }
});

app.use('/api/auth', limiterAuth, authRoutes);
app.use('/api/jornadas', jornadasRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((error, req, res, next) => {
  // Evita expor detalhes internos/credenciais do banco nas respostas HTTP.
  console.error('[erro-api]', error.message);
  if (res.headersSent) return next(error);
  return res.status(500).json({ erro: 'Erro interno da API.' });
});

module.exports = app;

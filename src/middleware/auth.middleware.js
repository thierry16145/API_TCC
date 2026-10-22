const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Envie o token no cabeçalho Authorization: Bearer SEU_TOKEN.' });
  }

  try {
    const segredo = process.env.JWT_SECRET;
    if (!segredo || segredo.length < 32) {
      return res.status(500).json({ erro: 'JWT_SECRET não foi configurado corretamente no arquivo .env.' });
    }

    req.usuario = jwt.verify(token, segredo);
    return next();
  } catch (error) {
    return res.status(401).json({ erro: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

module.exports = { autenticar };

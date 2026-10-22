const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { autenticar } = require('../middleware/auth.middleware');

const router = express.Router();

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

router.post('/register', async (req, res, next) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  if (nome.length < 2 || nome.length > 150) {
    return res.status(400).json({ erro: 'Informe um nome com 2 a 150 caracteres.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
    return res.status(400).json({ erro: 'Informe um e-mail válido com até 150 caracteres.' });
  }
  if (senha.length < 8 || senha.length > 128) {
    return res.status(400).json({ erro: 'A senha deve ter entre 8 e 128 caracteres.' });
  }

  let connection;
  try {
    const senhaHash = await bcrypt.hash(senha, 12);
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resultado] = await connection.execute(
      'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, 'motorista']
    );

    await connection.execute(
      'INSERT INTO configuracoes (usuario_id, precisao_gps, permissao_localizacao) VALUES (?, ?, ?)',
      [resultado.insertId, 'MEDIA', 'NAO_SOLICITADA']
    );

    await connection.commit();

    const usuario = { id: resultado.insertId, nome, email, perfil: 'motorista' };
    return res.status(201).json({ mensagem: 'Cadastro realizado com sucesso.', token: gerarToken(usuario), usuario });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe uma conta cadastrada com esse e-mail.' });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
});

router.post('/login', async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  try {
    const [usuarios] = await pool.execute(
      'SELECT id, nome, email, senha, perfil FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    const usuarioBanco = usuarios[0];

    // Compara a senha digitada com a hash que está salva no banco
    if (!usuarioBanco || !(await bcrypt.compare(senha, usuarioBanco.senha))) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = {
      id: usuarioBanco.id,
      nome: usuarioBanco.nome,
      email: usuarioBanco.email,
      perfil: usuarioBanco.perfil
    };

    return res.json({ mensagem: 'Login realizado com sucesso.', token: gerarToken(usuario), usuario });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', autenticar, async (req, res, next) => {
  try {
    const [usuarios] = await pool.execute(
      'SELECT id, nome, email, perfil, criado_em FROM usuarios WHERE id = ? LIMIT 1',
      [req.usuario.id]
    );
    if (!usuarios[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    return res.json({ usuario: usuarios[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
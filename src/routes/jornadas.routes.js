const express = require('express');
const { pool } = require('../config/database');
const { autenticar } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(autenticar);

router.post('/', async (req, res, next) => {
  try {
    const [ativas] = await pool.execute(
      "SELECT id FROM jornadas WHERE usuario_id = ? AND status = 'ATIVA' LIMIT 1",
      [req.usuario.id]
    );
    if (ativas.length) {
      return res.status(409).json({ erro: 'Você já possui uma jornada ativa.', jornada_id: ativas[0].id });
    }

    const [resultado] = await pool.execute(
      "INSERT INTO jornadas (usuario_id, inicio, status) VALUES (?, NOW(), 'ATIVA')",
      [req.usuario.id]
    );
    const [jornadas] = await pool.execute(
      'SELECT id, usuario_id, inicio, fim, status, criado_em FROM jornadas WHERE id = ?',
      [resultado.insertId]
    );
    return res.status(201).json({ mensagem: 'Jornada iniciada.', jornada: jornadas[0] });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const limiteInformado = Number.parseInt(req.query.limite, 10);
    const limite = Number.isInteger(limiteInformado) ? Math.max(1, Math.min(limiteInformado, 100)) : 20;
    const [jornadas] = await pool.query(
      `SELECT j.id, j.inicio, j.fim, j.status, j.criado_em,
        (SELECT COUNT(*) FROM pontos_localizacao p WHERE p.jornada_id = j.id) AS total_pontos
       FROM jornadas j WHERE j.usuario_id = ? ORDER BY j.inicio DESC LIMIT ${limite}`,
      [req.usuario.id]
    );
    return res.json({ jornadas });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'ID de jornada inválido.' });

  try {
    const [jornadas] = await pool.execute(
      'SELECT id, usuario_id, inicio, fim, status, criado_em FROM jornadas WHERE id = ? AND usuario_id = ? LIMIT 1',
      [id, req.usuario.id]
    );
    if (!jornadas[0]) return res.status(404).json({ erro: 'Jornada não encontrada.' });

    const [pontos] = await pool.execute(
      'SELECT id, latitude, longitude, velocidade_kmh, precisao_m, registrado_em FROM pontos_localizacao WHERE jornada_id = ? ORDER BY registrado_em ASC',
      [id]
    );
    return res.json({ jornada: jornadas[0], pontos });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/pontos', async (req, res, next) => {
  const jornadaId = Number.parseInt(req.params.id, 10);
  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);
  const velocidadeKmh = req.body.velocidadeKmh == null ? 0 : Number(req.body.velocidadeKmh);
  const precisaoM = req.body.precisaoM == null ? null : Number(req.body.precisaoM);

  if (!Number.isInteger(jornadaId) || jornadaId < 1) {
    return res.status(400).json({ erro: 'ID de jornada inválido.' });
  }
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ erro: 'Latitude deve estar entre -90 e 90.' });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ erro: 'Longitude deve estar entre -180 e 180.' });
  }
  if (!Number.isFinite(velocidadeKmh) || velocidadeKmh < 0 || velocidadeKmh > 500) {
    return res.status(400).json({ erro: 'Velocidade inválida (use um valor entre 0 e 500 km/h).' });
  }
  if (precisaoM !== null && (!Number.isFinite(precisaoM) || precisaoM < 0)) {
    return res.status(400).json({ erro: 'Precisão GPS inválida.' });
  }

  try {
    const [jornadas] = await pool.execute(
      "SELECT id FROM jornadas WHERE id = ? AND usuario_id = ? AND status = 'ATIVA' LIMIT 1",
      [jornadaId, req.usuario.id]
    );
    if (!jornadas[0]) {
      return res.status(404).json({ erro: 'Jornada ativa não encontrada para este usuário.' });
    }

    const registradoEm = req.body.registradoEm ? new Date(req.body.registradoEm) : new Date();
    if (Number.isNaN(registradoEm.getTime())) {
      return res.status(400).json({ erro: 'Data/hora do ponto inválida. Use uma data ISO 8601.' });
    }

    const [resultado] = await pool.execute(
      'INSERT INTO pontos_localizacao (jornada_id, latitude, longitude, velocidade_kmh, precisao_m, registrado_em) VALUES (?, ?, ?, ?, ?, ?)',
      [jornadaId, latitude, longitude, velocidadeKmh, precisaoM, registradoEm]
    );
    return res.status(201).json({
      mensagem: 'Ponto de localização registrado.',
      ponto: { id: resultado.insertId, jornada_id: jornadaId, latitude, longitude, velocidade_kmh: velocidadeKmh, precisao_m: precisaoM, registrado_em: registradoEm }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/finalizar', async (req, res, next) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'ID de jornada inválido.' });

  try {
    const [resultado] = await pool.execute(
      "UPDATE jornadas SET fim = NOW(), status = 'FINALIZADA' WHERE id = ? AND usuario_id = ? AND status = 'ATIVA'",
      [id, req.usuario.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Jornada ativa não encontrada para este usuário.' });
    }
    const [jornadas] = await pool.execute(
      'SELECT id, usuario_id, inicio, fim, status, criado_em FROM jornadas WHERE id = ?',
      [id]
    );
    return res.json({ mensagem: 'Jornada finalizada.', jornada: jornadas[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

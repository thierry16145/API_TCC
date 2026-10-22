const express = require('express');
const { pool } = require('../config/database');
const { autenticar } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(autenticar);

// Retorna os dados de uma jornada usando os nomes reais das colunas.
// Os aliases inicio e fim mantêm compatibilidade com respostas anteriores.
const selecionarJornada = `
  SELECT
    id,
    usuario_id,
    data_hora_inicio,
    data_hora_fim,
    data_hora_inicio AS inicio,
    data_hora_fim AS fim,
    status,
    distancia_total
  FROM jornadas
`;

// Validar o ID recebido pela URL.
function obterIdJornada(valor) {
  const id = Number.parseInt(valor, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Listar os pontos GPS de uma jornada.
async function listarPontos(jornadaId) {
  const [pontos] = await pool.execute(
    `SELECT
       id,
       jornada_id,
       latitude,
       longitude,
       velocidade_kmh,
       precisao_m,
       registrado_em
     FROM pontos_localizacao
     WHERE jornada_id = ?
     ORDER BY registrado_em ASC`,
    [jornadaId]
  );

  return pontos;
}

// 1. Iniciar uma jornada.
router.post('/', async (req, res, next) => {
  try {
    const [ativas] = await pool.execute(
      `SELECT id
       FROM jornadas
       WHERE usuario_id = ? AND status = 'ATIVA'
       LIMIT 1`,
      [req.usuario.id]
    );

    if (ativas.length > 0) {
      return res.status(409).json({
        erro: 'Você já possui uma jornada ativa.',
        jornada_id: ativas[0].id
      });
    }

    // Utilizar as colunas reais existentes no TiDB Cloud.
    const [resultado] = await pool.execute(
      `INSERT INTO jornadas
         (usuario_id, data_hora_inicio, status)
       VALUES (?, NOW(), 'ATIVA')`,
      [req.usuario.id]
    );

    const [jornadas] = await pool.execute(
      `${selecionarJornada} WHERE id = ? LIMIT 1`,
      [resultado.insertId]
    );

    return res.status(201).json({
      mensagem: 'Jornada iniciada.',
      jornada: jornadas[0]
    });
  } catch (error) {
    return next(error);
  }
});

// 2. Listar as jornadas do usuário autenticado.
router.get('/', async (req, res, next) => {
  try {
    const limiteInformado = Number.parseInt(req.query.limite, 10);

    const limite = Number.isInteger(limiteInformado)
      ? Math.max(1, Math.min(limiteInformado, 100))
      : 20;

    const [jornadas] = await pool.query(
      `SELECT
         j.id,
         j.usuario_id,
         j.data_hora_inicio,
         j.data_hora_fim,
         j.data_hora_inicio AS inicio,
         j.data_hora_fim AS fim,
         j.status,
         j.distancia_total,
         (
           SELECT COUNT(*)
           FROM pontos_localizacao p
           WHERE p.jornada_id = j.id
         ) AS total_pontos
       FROM jornadas j
       WHERE j.usuario_id = ?
       ORDER BY j.data_hora_inicio DESC
       LIMIT ${limite}`,
      [req.usuario.id]
    );

    return res.json({ jornadas });
  } catch (error) {
    return next(error);
  }
});

// 3. Consultar somente os pontos GPS de uma jornada.
router.get('/:id/pontos', async (req, res, next) => {
  const id = obterIdJornada(req.params.id);

  if (!id) {
    return res.status(400).json({
      erro: 'ID de jornada inválido.'
    });
  }

  try {
    const [jornadas] = await pool.execute(
      `SELECT id
       FROM jornadas
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`,
      [id, req.usuario.id]
    );

    if (jornadas.length === 0) {
      return res.status(404).json({
        erro: 'Jornada não encontrada.'
      });
    }

    const pontos = await listarPontos(id);

    return res.json({
      jornada_id: id,
      total_pontos: pontos.length,
      pontos
    });
  } catch (error) {
    return next(error);
  }
});

// 4. Consultar uma jornada específica e seus pontos GPS.
router.get('/:id', async (req, res, next) => {
  const id = obterIdJornada(req.params.id);

  if (!id) {
    return res.status(400).json({
      erro: 'ID de jornada inválido.'
    });
  }

  try {
    const [jornadas] = await pool.execute(
      `${selecionarJornada}
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`,
      [id, req.usuario.id]
    );

    if (jornadas.length === 0) {
      return res.status(404).json({
        erro: 'Jornada não encontrada.'
      });
    }

    const pontos = await listarPontos(id);

    return res.json({
      jornada: jornadas[0],
      pontos
    });
  } catch (error) {
    return next(error);
  }
});

// 5. Registrar um ponto GPS.
router.post('/:id/pontos', async (req, res, next) => {
  const jornadaId = obterIdJornada(req.params.id);

  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  const velocidadeKmh = req.body.velocidadeKmh == null
    ? 0
    : Number(req.body.velocidadeKmh);

  const precisaoM = req.body.precisaoM == null
    ? null
    : Number(req.body.precisaoM);

  if (!jornadaId) {
    return res.status(400).json({
      erro: 'ID de jornada inválido.'
    });
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({
      erro: 'Latitude deve estar entre -90 e 90.'
    });
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({
      erro: 'Longitude deve estar entre -180 e 180.'
    });
  }

  if (
    !Number.isFinite(velocidadeKmh) ||
    velocidadeKmh < 0 ||
    velocidadeKmh > 500
  ) {
    return res.status(400).json({
      erro: 'Velocidade inválida. Use um valor entre 0 e 500 km/h.'
    });
  }

  if (
    precisaoM !== null &&
    (!Number.isFinite(precisaoM) || precisaoM < 0)
  ) {
    return res.status(400).json({
      erro: 'Precisão GPS inválida.'
    });
  }

  try {
    const [jornadas] = await pool.execute(
      `SELECT id
       FROM jornadas
       WHERE id = ?
         AND usuario_id = ?
         AND status = 'ATIVA'
       LIMIT 1`,
      [jornadaId, req.usuario.id]
    );

    if (jornadas.length === 0) {
      return res.status(404).json({
        erro: 'Jornada ativa não encontrada para este usuário.'
      });
    }

    const registradoEm = req.body.registradoEm
      ? new Date(req.body.registradoEm)
      : new Date();

    if (Number.isNaN(registradoEm.getTime())) {
      return res.status(400).json({
        erro: 'Data/hora do ponto inválida. Use uma data ISO 8601.'
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO pontos_localizacao
         (
           jornada_id,
           latitude,
           longitude,
           velocidade_kmh,
           precisao_m,
           registrado_em
         )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        jornadaId,
        latitude,
        longitude,
        velocidadeKmh,
        precisaoM,
        registradoEm
      ]
    );

    return res.status(201).json({
      mensagem: 'Ponto de localização registrado.',
      ponto: {
        id: resultado.insertId,
        jornada_id: jornadaId,
        latitude,
        longitude,
        velocidade_kmh: velocidadeKmh,
        precisao_m: precisaoM,
        registrado_em: registradoEm
      }
    });
  } catch (error) {
    return next(error);
  }
});

// 6. Finalizar uma jornada ativa.
router.patch('/:id/finalizar', async (req, res, next) => {
  const id = obterIdJornada(req.params.id);

  if (!id) {
    return res.status(400).json({
      erro: 'ID de jornada inválido.'
    });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE jornadas
       SET data_hora_fim = NOW(),
           status = 'FINALIZADA'
       WHERE id = ?
         AND usuario_id = ?
         AND status = 'ATIVA'`,
      [id, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Jornada ativa não encontrada para este usuário.'
      });
    }

    const [jornadas] = await pool.execute(
      `${selecionarJornada}
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`,
      [id, req.usuario.id]
    );

    return res.json({
      mensagem: 'Jornada finalizada.',
      jornada: jornadas[0]
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
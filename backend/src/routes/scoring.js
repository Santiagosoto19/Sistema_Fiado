const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper: verificar que el cliente está asociado a este tendero Y tiene al menos un crédito
async function verificarCliente(pool, idTendero, clienteId) {
  const [relacion, credito] = await Promise.all([
    pool.query(`
      SELECT 1 FROM tendero_cliente
      WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
      LIMIT 1
    `, [idTendero, clienteId]),
    pool.query(`
      SELECT 1 FROM creditos WHERE id_tendero = $1 AND id_cliente = $2 LIMIT 1
    `, [idTendero, clienteId])
  ]);
  return relacion.rows.length > 0 && credito.rows.length > 0;
}

// Helper: calcular scoring desde las tablas créditos/abonos/cliente (filtrado por tendero)
async function calcularScoring(pool, idTendero, clienteId) {
  const [creditosRes, abonosRes, clienteRes] = await Promise.all([
    pool.query(`
      SELECT * FROM creditos
      WHERE id_tendero = $1 AND id_cliente = $2
      ORDER BY fecha_credito ASC
    `, [idTendero, clienteId]),
    pool.query(`
      SELECT a.* FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE c.id_tendero = $1 AND a.id_cliente = $2
      ORDER BY a.fecha_abono ASC
    `, [idTendero, clienteId]),
    pool.query(`SELECT * FROM clientes WHERE id_cliente = $1`, [clienteId])
  ]);

  const creditos = creditosRes.rows;
  const abonos = abonosRes.rows;
  const cliente = clienteRes.rows[0];

  if (!cliente) throw new Error('Cliente no encontrado');
  if (creditos.length === 0) return null; // Sin historial → no hay scoring real

  // 1. Puntualidad (0-25 pts)
  const creditosVencidos = creditos.filter(c => c.estado === 'vencido');
  const ptsPuntualidad = creditosVencidos.length === 0
    ? 25
    : Math.max(0, Math.round(25 * (1 - creditosVencidos.length / creditos.length)));

  // 2. Historial (0-25 pts)
  const totalCreditos = creditos.length;
  let ptsHistorial = 0;
  if (totalCreditos >= 10) ptsHistorial = 25;
  else if (totalCreditos >= 5) ptsHistorial = 20;
  else if (totalCreditos >= 3) ptsHistorial = 15;
  else if (totalCreditos >= 1) ptsHistorial = 10;

  // 3. Frecuencia (0-25 pts)
  const totalFiado = creditos.reduce((s, c) => s + parseFloat(c.monto_total), 0);
  const totalAbonado = abonos.reduce((s, a) => s + parseFloat(a.monto), 0);
  const ratioPago = totalFiado > 0 ? totalAbonado / totalFiado : 0;

  let ptsFrecuencia = 0;
  if (ratioPago >= 0.95) ptsFrecuencia = 25;
  else if (ratioPago >= 0.80) ptsFrecuencia = 20;
  else if (ratioPago >= 0.50) ptsFrecuencia = 15;
  else if (ratioPago >= 0.25) ptsFrecuencia = 10;
  else ptsFrecuencia = 5;

  // 4. Antigüedad (0-25 pts)
  const fechaPrimerCredito = new Date(cliente.created_at);
  const mesesActivo = (new Date() - fechaPrimerCredito) / (1000 * 60 * 60 * 24 * 30);

  let ptsAntiguedad = 0;
  if (mesesActivo >= 24) ptsAntiguedad = 25;
  else if (mesesActivo >= 12) ptsAntiguedad = 20;
  else if (mesesActivo >= 6) ptsAntiguedad = 15;
  else if (mesesActivo >= 3) ptsAntiguedad = 10;
  else if (mesesActivo >= 1) ptsAntiguedad = 5;

  const puntajeTotal = ptsPuntualidad + ptsHistorial + ptsFrecuencia + ptsAntiguedad;

  let nivelRiesgo;
  if (puntajeTotal >= 80) nivelRiesgo = 'bajo';
  else if (puntajeTotal >= 50) nivelRiesgo = 'medio';
  else nivelRiesgo = 'alto';

  const montoUltimoCredito = parseFloat(creditos[creditos.length - 1].monto_total);
  let limiteSugerido;
  if (nivelRiesgo === 'bajo') limiteSugerido = Math.max(montoUltimoCredito * 1.5, 50000);
  else if (nivelRiesgo === 'medio') limiteSugerido = Math.max(montoUltimoCredito * 1.2, 30000);
  else limiteSugerido = Math.max(montoUltimoCredito * 0.8, 10000);

  return {
    id_cliente: clienteId,
    puntaje: puntajeTotal,
    nivel_riesgo: nivelRiesgo,
    limite_sugerido: limiteSugerido,
    pts_puntualidad: ptsPuntualidad,
    pts_historial: ptsHistorial,
    pts_frecuencia: ptsFrecuencia,
    pts_antiguedad: ptsAntiguedad
  };
}

// Helper: persistir scoring en DB
async function guardarScoring(pool, scoring) {
  const existing = await pool.query(`SELECT id_scoring FROM scoring WHERE id_cliente = $1`, [scoring.id_cliente]);
  if (existing.rows.length > 0) {
    await pool.query(`
      UPDATE scoring SET
        puntaje = $1, nivel_riesgo = $2, pts_puntualidad = $3,
        pts_historial = $4, pts_frecuencia = $5, pts_antiguedad = $6,
        limite_sugerido = $7, fecha_calculo = NOW()
      WHERE id_cliente = $8
    `, [
      scoring.puntaje, scoring.nivel_riesgo, scoring.pts_puntualidad,
      scoring.pts_historial, scoring.pts_frecuencia, scoring.pts_antiguedad,
      scoring.limite_sugerido, scoring.id_cliente
    ]);
  } else {
    await pool.query(`
      INSERT INTO scoring (id_cliente, puntaje, nivel_riesgo, pts_puntualidad,
        pts_historial, pts_frecuencia, pts_antiguedad, limite_sugerido)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      scoring.id_cliente, scoring.puntaje, scoring.nivel_riesgo,
      scoring.pts_puntualidad, scoring.pts_historial, scoring.pts_frecuencia,
      scoring.pts_antiguedad, scoring.limite_sugerido
    ]);
  }
}

// GET /api/scoring/:clienteId
// Lee directo de la tabla. Si no existe Y el cliente tiene historial, lo calcula y guarda.
router.get('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    if (!(await verificarCliente(pool, idTendero, clienteId))) {
      return res.status(404).json({ error: 'Ese cliente no tiene ningún crédito asociado a esa tienda' });
    }

    let scoring = await pool.query(`
      SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
    `, [clienteId]);

    // Si no hay scoring persistido, intentar calcularlo
    if (scoring.rows.length === 0) {
      const calculado = await calcularScoring(pool, idTendero, clienteId);
      if (!calculado) {
        return res.status(404).json({ error: 'El cliente no tiene historial crediticio. Scoring no disponible.' });
      }
      await guardarScoring(pool, calculado);
      scoring = await pool.query(`
        SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
      `, [clienteId]);
    }

    const s = scoring.rows[0];
    res.json({
      id_cliente: clienteId,
      puntaje_total: s.puntaje,
      nivel_riesgo: s.nivel_riesgo,
      limite_sugerido: parseFloat(s.limite_sugerido),
      fecha_calculo: s.fecha_calculo,
      desglose: {
        puntualidad: s.pts_puntualidad,
        historial: s.pts_historial,
        frecuencia: s.pts_frecuencia,
        antiguedad: s.pts_antiguedad
      }
    });
  } catch (err) {
    console.error('Error en scoring GET:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/scoring/:clienteId/calcular
// Fuerza un recálculo completo y lo persiste.
router.post('/:clienteId/calcular', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    if (!(await verificarCliente(pool, idTendero, clienteId))) {
      return res.status(404).json({ error: 'Ese cliente no tiene ningún crédito asociado a esa tienda' });
    }

    const calculado = await calcularScoring(pool, idTendero, clienteId);
    if (!calculado) {
      return res.status(400).json({ error: 'El cliente no tiene historial crediticio' });
    }

    await guardarScoring(pool, calculado);

    res.json({
      message: 'Scoring calculado correctamente',
      ...calculado,
      desglose: {
        puntualidad: calculado.pts_puntualidad,
        historial: calculado.pts_historial,
        frecuencia: calculado.pts_frecuencia,
        antiguedad: calculado.pts_antiguedad
      }
    });
  } catch (err) {
    console.error('Error al calcular scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/scoring/:clienteId/recomendacion
// Lee directo de la tabla scoring. No recalcula nada.
router.get('/:clienteId/recomendacion', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    if (!(await verificarCliente(pool, idTendero, clienteId))) {
      return res.status(404).json({ error: 'Ese cliente no tiene ningún crédito asociado a esa tienda' });
    }

    const scoring = await pool.query(`
      SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
    `, [clienteId]);

    if (scoring.rows.length === 0) {
      return res.status(404).json({ error: 'No existe scoring. Calcula primero el scoring.' });
    }

    const s = scoring.rows[0];
    const puntaje = s.puntaje;
    let recomendacion, mensaje;

    if (puntaje >= 80) {
      recomendacion = 'aprobar';
      mensaje = `El cliente tiene un excelente historial con ${puntaje} puntos. Es muy recomendable aprobar nuevos créditos.`;
    } else if (puntaje >= 60) {
      recomendacion = 'aprobar';
      mensaje = `Con ${puntaje} puntos, el cliente tiene un buen comportamiento de pago. Se recomienda aprobar con monitoreo regular.`;
    } else if (puntaje >= 40) {
      recomendacion = 'con_precaucion';
      mensaje = `El cliente tiene ${puntaje} puntos y un nivel de riesgo ${s.nivel_riesgo}. Se recomienda aprobar solo montos pequeños y con fecha de pago corta.`;
    } else {
      recomendacion = 'rechazar';
      mensaje = `Con solo ${puntaje} puntos y nivel de riesgo ${s.nivel_riesgo}, el cliente presenta alto riesgo de mora. No se recomienda aprobar nuevos créditos en este momento.`;
    }

    res.json({
      id_cliente: clienteId,
      recomendacion,
      mensaje,
      scoring: {
        puntaje: s.puntaje,
        nivel_riesgo: s.nivel_riesgo,
        limite_sugerido: parseFloat(s.limite_sugerido)
      }
    });
  } catch (err) {
    console.error('Error en recomendación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
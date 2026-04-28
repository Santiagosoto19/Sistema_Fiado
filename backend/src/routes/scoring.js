const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/scoring/:clienteId
router.get('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    // Verificar pertenencia
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const scoring = await pool.query(`
      SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
    `, [clienteId]);

    if (scoring.rows.length === 0) {
      return res.status(404).json({ error: 'No existe scoring para este cliente. Ejecuta el cálculo primero.' });
    }

    const s = scoring.rows[0];

    res.json({
      id_cliente: parseInt(clienteId),
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
    console.error('Error en scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/scoring/:clienteId/calcular
router.post('/:clienteId/calcular', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Obtener datos históricos del cliente
    const creditos = await pool.query(`
      SELECT * FROM creditos WHERE id_cliente = $1 ORDER BY fecha_credito ASC
    `, [clienteId]);

    const abonos = await pool.query(`
      SELECT * FROM abonos WHERE id_cliente = $1 ORDER BY fecha_abono ASC
    `, [clienteId]);

    const cliente = await pool.query(`
      SELECT * FROM clientes WHERE id_cliente = $1
    `, [clienteId]);

    if (creditos.rows.length === 0) {
      return res.status(400).json({ error: 'El cliente no tiene historial crediticio' });
    }

    // CALCULAR PUNTAJE
    // Puntuidad (0-25 pts)
    let ptsPuntualidad = 0;
    const creditosVencidos = creditos.rows.filter(c => c.estado === 'vencido');
    if (creditosVencidos.length === 0) {
      ptsPuntualidad = 25;
    } else {
      const porcentajeVencido = creditosVencidos.length / creditos.rows.length;
      ptsPuntualidad = Math.max(0, Math.round(25 * (1 - porcentajeVencido)));
    }

    // Historial (0-25 pts)
    let ptsHistorial = 0;
    const totalCreditos = creditos.rows.length;
    if (totalCreditos >= 10) {
      ptsHistorial = 25;
    } else if (totalCreditos >= 5) {
      ptsHistorial = 20;
    } else if (totalCreditos >= 3) {
      ptsHistorial = 15;
    } else if (totalCreditos >= 1) {
      ptsHistorial = 10;
    }

    // Frecuencia (0-25 pts)
    let ptsFrecuencia = 0;
    if (abonos.rows.length > 0) {
      const totalAbonado = abonos.rows.reduce((sum, a) => sum + parseFloat(a.monto), 0);
      const totalFiado = creditos.rows.reduce((sum, c) => sum + parseFloat(c.monto_total), 0);
      const ratioPago = totalFiado > 0 ? totalAbonado / totalFiado : 0;

      if (ratioPago >= 0.95) ptsFrecuencia = 25;
      else if (ratioPago >= 0.80) ptsFrecuencia = 20;
      else if (ratioPago >= 0.50) ptsFrecuencia = 15;
      else if (ratioPago >= 0.25) ptsFrecuencia = 10;
      else ptsFrecuencia = 5;
    }

    // Antigüedad (0-25 pts)
    let ptsAntiguedad = 0;
    const fechaPrimerCredito = new Date(clientes.rows[0].created_at);
    const hoy = new Date();
    const mesesActivo = (hoy - fechaPrimerCredito) / (1000 * 60 * 60 * 24 * 30);

    if (mesesActivo >= 24) ptsAntiguedad = 25;
    else if (mesesActivo >= 12) ptsAntiguedad = 20;
    else if (mesesActivo >= 6) ptsAntiguedad = 15;
    else if (mesesActivo >= 3) ptsAntiguedad = 10;
    else if (mesesActivo >= 1) ptsAntiguedad = 5;

    const puntajeTotal = ptsPuntualidad + ptsHistorial + ptsFrecuencia + ptsAntiguedad;

    // Nivel de riesgo
    let nivelRiesgo;
    if (puntajeTotal >= 80) nivelRiesgo = 'bajo';
    else if (puntajeTotal >= 50) nivelRiesgo = 'medio';
    else nivelRiesgo = 'alto';

    // Límite sugerido basado en scoring
    let limiteSugerido = 0;
    const ultimoCredito = creditos.rows[creditos.rows.length - 1];
    const montoUltimoCredito = parseFloat(ultimoCredito.monto_total);

    if (nivelRiesgo === 'bajo') {
      limiteSugerido = Math.max(montoUltimoCredito * 1.5, 50000);
    } else if (nivelRiesgo === 'medio') {
      limiteSugerido = Math.max(montoUltimoCredito * 1.2, 30000);
    } else {
      limiteSugerido = Math.max(montoUltimoCredito * 0.8, 10000);
    }

    // Actualizar o insertar scoring
    const existingScoring = await pool.query(`
      SELECT id_scoring FROM scoring WHERE id_cliente = $1
    `, [clienteId]);

    if (existingScoring.rows.length > 0) {
      await pool.query(`
        UPDATE scoring SET puntaje = $1, nivel_riesgo = $2, pts_puntualidad = $3,
               pts_historial = $4, pts_frecuencia = $5, pts_antiguedad = $6,
               limite_sugerido = $7, fecha_calculo = NOW()
        WHERE id_cliente = $8
      `, [puntajeTotal, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsFrecuencia, ptsAntiguedad, limiteSugerido, clienteId]);
    } else {
      await pool.query(`
        INSERT INTO scoring (id_cliente, puntaje, nivel_riesgo, pts_puntualidad, pts_historial,
                           pts_frecuencia, pts_antiguedad, limite_sugerido)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [clienteId, puntajeTotal, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsFrecuencia, ptsAntiguedad, limiteSugerido]);
    }

    res.json({
      message: 'Scoring calculado correctamente',
      id_cliente: parseInt(clienteId),
      puntaje_total: puntajeTotal,
      nivel_riesgo: nivelRiesgo,
      limite_sugerido: limiteSugerido,
      desglose: {
        puntualidad: ptsPuntualidad,
        historial: ptsHistorial,
        frecuencia: ptsFrecuencia,
        antiguedad: ptsAntiguedad
      }
    });
  } catch (err) {
    console.error('Error al calcular scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/scoring/:clienteId/recomendacion
router.get('/:clienteId/recomendacion', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const scoring = await pool.query(`
      SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
    `, [clienteId]);

    if (scoring.rows.length === 0) {
      return res.status(404).json({ error: 'No existe scoring. Calcula primero el scoring.' });
    }

    const s = scoring.rows[0];

    let recomendacion;
    let mensaje;

    if (s.puntaje >= 80) {
      recomendacion = 'aprobar';
      mensaje = `El cliente tiene un excelente historial con ${s.puntaje} puntos. Es muy recomendable aprobar nuevos créditos.`;
    } else if (s.puntaje >= 60) {
      recomendacion = 'aprobar';
      mensaje = `Con ${s.puntaje} puntos, el cliente tiene un buen comportamiento de pago. Se recomienda aprobar con monitoreo regular.`;
    } else if (s.puntaje >= 40) {
      recomendacion = 'con_precaucion';
      mensaje = `El cliente tiene ${s.puntaje} puntos y un nivel de riesgo ${s.nivel_riesgo}. Se recomienda aprobar solo montos pequeños y con fecha de pago corta.`;
    } else {
      recomendacion = 'rechazar';
      mensaje = `Con solo ${s.puntaje} puntos y nivel de riesgo ${s.nivel_riesgo}, el cliente presenta alto riesgo de mora. No se recomienda aprobar nuevos créditos en este momento.`;
    }

    res.json({
      id_cliente: parseInt(clienteId),
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
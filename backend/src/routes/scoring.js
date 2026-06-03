const express = require('express');
const http = require('http');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { triggerMLRetrain } = require('../utils/mlTrigger');

const router = express.Router();
router.use(authMiddleware);

function callMLService(clienteId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ id_cliente: parseInt(clienteId) });
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/predict',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function calcularPuntaje(s) {
  return (s.pts_puntualidad || 0) + (s.pts_cumplimiento || 0) + (s.pts_historial || 0) + (s.pts_antiguedad || 0);
}

// GET /api/scoring/:clienteId
router.get('/:clienteId', async (req, res) => {
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
      return res.status(404).json({ error: 'No existe scoring para este cliente. Ejecuta el cálculo primero.' });
    }

    const s = scoring.rows[0];
    const puntajeTotal = calcularPuntaje(s);

    res.json({
      id_cliente: parseInt(clienteId),
      puntaje_total: puntajeTotal,
      nivel_riesgo: s.nivel_riesgo,
      limite_sugerido: parseFloat(s.limite_sugerido),
      fecha_calculo: s.fecha_calculo,
      desglose: {
        puntualidad: s.pts_puntualidad,
        cumplimiento: s.pts_cumplimiento,
        historial: s.pts_historial,
        antiguedad: s.pts_antiguedad
      },
      confianza: s.confianza ? parseFloat(s.confianza) : null
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

    // Obtener datos del cliente
    const clienteRow = await pool.query(`
      SELECT * FROM clientes WHERE id_cliente = $1
    `, [clienteId]);

    // Obtener todos los créditos del cliente
    const creditos = await pool.query(`
      SELECT * FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 ORDER BY fecha_credito ASC
    `, [clienteId, idTendero]);

    // CASO CLIENTE NUEVO — sin historial crediticio
    if (creditos.rows.length === 0) {
      const ptsPuntualidad = 0;
      const ptsCumplimiento = 0;
      const ptsHistorial = 0;
      const ptsAntiguedad = 0;
      const puntajeTotal = 50; // puntaje conceptual para cliente nuevo
      const nivelRiesgo = 'medio';
      const limiteSugerido = 50000;

      await upsertScoring(clienteId, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsCumplimiento, ptsAntiguedad, limiteSugerido);
      triggerMLRetrain('scoring_nuevo').catch(() => {});

      return res.json({
        message: 'Scoring calculado correctamente (cliente nuevo)',
        id_cliente: parseInt(clienteId),
        puntaje_total: puntajeTotal,
        nivel_riesgo: nivelRiesgo,
        limite_sugerido: limiteSugerido,
        desglose: {
          puntualidad: ptsPuntualidad,
          cumplimiento: ptsCumplimiento,
          historial: ptsHistorial,
          antiguedad: ptsAntiguedad
        },
        confianza: null
      });
    }

    // Obtener todos los abonos del cliente
    const abonos = await pool.query(`
      SELECT * FROM abonos WHERE id_cliente = $1 ORDER BY fecha_abono ASC
    `, [clienteId]);

    // Agrupar abonos por id_credito
    const abonosPorCredito = {};
    abonos.rows.forEach(a => {
      if (!abonosPorCredito[a.id_credito]) abonosPorCredito[a.id_credito] = [];
      abonosPorCredito[a.id_credito].push(a);
    });

    // ── Categorizar créditos ──
    const creditosPagados = creditos.rows.filter(c => c.estado === 'pagado');
    const creditosVencidos = creditos.rows.filter(c => c.estado === 'vencido');
    const creditosCerrados = [...creditosPagados, ...creditosVencidos]; // pagado + vencido

    // ── 1. PUNTUALIDAD (0-25 pts) ──
    let ptsPuntualidad = 0;
    if (creditosCerrados.length > 0) {
      let pagosATiempo = 0;
      creditosCerrados.forEach(c => {
        if (c.estado === 'vencido') return;
        const abs = abonosPorCredito[c.id_credito];
        if (abs && abs.length > 0) {
          const ultimoAbono = abs.reduce((max, a) =>
            new Date(a.fecha_abono) > new Date(max.fecha_abono) ? a : max
          );
          const fechaLimite = new Date(c.fecha_limite_pago);
          const fechaAbono = new Date(ultimoAbono.fecha_abono);
          if (fechaAbono <= fechaLimite) pagosATiempo++;
        }
      });
      const ratio = pagosATiempo / creditosCerrados.length;
      if (ratio >= 0.80) ptsPuntualidad = 25;
      else if (ratio >= 0.60) ptsPuntualidad = 20;
      else if (ratio >= 0.40) ptsPuntualidad = 15;
      else if (ratio > 0) ptsPuntualidad = 10;
      else ptsPuntualidad = 0;
    }

    // ── 2. CUMPLIMIENTO (0-25 pts) ──
    let ptsCumplimiento = 0;
    if (creditosCerrados.length > 0) {
      let diasAtrasoTotal = 0;
      creditosCerrados.forEach(c => {
        if (c.estado === 'vencido') {
          diasAtrasoTotal += 31;
        } else {
          const abs = abonosPorCredito[c.id_credito];
          if (abs && abs.length > 0) {
            const ultimoAbono = abs.reduce((max, a) =>
              new Date(a.fecha_abono) > new Date(max.fecha_abono) ? a : max
            );
            const fechaLimite = new Date(c.fecha_limite_pago);
            const fechaAbono = new Date(ultimoAbono.fecha_abono);
            const diffMs = fechaAbono - fechaLimite;
            const diffDays = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
            diasAtrasoTotal += diffDays;
          }
        }
      });
      const promedioAtraso = Math.round(diasAtrasoTotal / creditosCerrados.length);

      if (promedioAtraso === 0) ptsCumplimiento = 25;
      else if (promedioAtraso <= 7) ptsCumplimiento = 20;
      else if (promedioAtraso <= 15) ptsCumplimiento = 15;
      else if (promedioAtraso <= 30) ptsCumplimiento = 10;
      else ptsCumplimiento = 0;
    }

    // ── 3. HISTORIAL (0-25 pts) ──
    let ptsHistorial = 0;
    if (creditosCerrados.length > 0) {
      const ratio = creditosPagados.length / creditosCerrados.length;
      if (ratio >= 0.90) ptsHistorial = 25;
      else if (ratio >= 0.70) ptsHistorial = 20;
      else if (ratio >= 0.50) ptsHistorial = 15;
      else ptsHistorial = 10;
    }

    // ── 4. ANTIGÜEDAD (0-25 pts) ──
    let ptsAntiguedad = 0;
    const fechaRegistro = new Date(clienteRow.rows[0].created_at);
    const hoy = new Date();
    const mesesActivo = (hoy - fechaRegistro) / (1000 * 60 * 60 * 24 * 30);

    if (mesesActivo >= 24) ptsAntiguedad = 25;
    else if (mesesActivo >= 12) ptsAntiguedad = 20;
    else if (mesesActivo >= 6) ptsAntiguedad = 15;
    else if (mesesActivo >= 3) ptsAntiguedad = 10;
    else if (mesesActivo >= 1) ptsAntiguedad = 5;

    const puntajeTotal = ptsPuntualidad + ptsCumplimiento + ptsHistorial + ptsAntiguedad;

    // ── Nivel de riesgo inicial por reglas ──
    let nivelRiesgo;
    if (puntajeTotal >= 80) nivelRiesgo = 'bajo';
    else if (puntajeTotal >= 50) nivelRiesgo = 'medio';
    else nivelRiesgo = 'alto';

    // ── Límite sugerido ──
    const ultimosCerrados = creditosCerrados
      .sort((a, b) => new Date(b.fecha_credito) - new Date(a.fecha_credito))
      .slice(0, 3);

    let base = 0;
    if (ultimosCerrados.length > 0) {
      const sumaMontos = ultimosCerrados.reduce((sum, c) => sum + parseFloat(c.monto_total), 0);
      base = sumaMontos / ultimosCerrados.length;
    }

    let factor;
    if (nivelRiesgo === 'bajo') factor = 1.5;
    else if (nivelRiesgo === 'medio') factor = 1.0;
    else factor = 0.5;

    const saldoPendienteActual = creditos.rows
      .filter(c => c.estado !== 'pagado')
      .reduce((sum, c) => sum + parseFloat(c.saldo_pendiente), 0);

    let limiteSugerido = Math.max(0, Math.round(base * factor - saldoPendienteActual));
    limiteSugerido = Math.min(limiteSugerido, 300000);

    if (limiteSugerido === 0 && ultimosCerrados.length === 0) {
      limiteSugerido = 50000;
    }

    // Guardar scoring en BD (sin puntaje; se calcula on-the-fly)
    await upsertScoring(clienteId, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsCumplimiento, ptsAntiguedad, limiteSugerido);
    triggerMLRetrain('scoring_nuevo').catch(() => {});

    // Obtener predicción ML y sobreescribir nivel_riesgo + confianza
    let rf = null;
    try {
      rf = await callMLService(clienteId);
      await pool.query(`
        UPDATE scoring
        SET nivel_riesgo = $1, confianza = $2
        WHERE id_scoring = (
          SELECT id_scoring FROM scoring WHERE id_cliente = $3 ORDER BY fecha_calculo DESC LIMIT 1
        )
      `, [rf.nivel_riesgo, rf.confianza, clienteId]);
    } catch (mlErr) {
      console.error('Error guardando predicción ML en scoring:', mlErr.message);
    }

    res.json({
      message: 'Scoring calculado correctamente',
      id_cliente: parseInt(clienteId),
      puntaje_total: puntajeTotal,
      nivel_riesgo: rf ? rf.nivel_riesgo : nivelRiesgo,
      limite_sugerido: limiteSugerido,
      desglose: {
        puntualidad: ptsPuntualidad,
        cumplimiento: ptsCumplimiento,
        historial: ptsHistorial,
        antiguedad: ptsAntiguedad
      },
      confianza: rf ? rf.confianza : null
    });
  } catch (err) {
    console.error('Error al calcular scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

async function upsertScoring(clienteId, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsCumplimiento, ptsAntiguedad, limiteSugerido) {
  const existing = await pool.query(`
    SELECT id_scoring FROM scoring WHERE id_cliente = $1
  `, [clienteId]);

  if (existing.rows.length > 0) {
    await pool.query(`
      UPDATE scoring SET nivel_riesgo = $1, pts_puntualidad = $2,
             pts_historial = $3, pts_cumplimiento = $4, pts_antiguedad = $5,
             limite_sugerido = $6, fecha_calculo = NOW(), confianza = NULL
      WHERE id_cliente = $7
    `, [nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsCumplimiento, ptsAntiguedad, limiteSugerido, clienteId]);
  } else {
    await pool.query(`
      INSERT INTO scoring (id_cliente, nivel_riesgo, pts_puntualidad, pts_historial,
                         pts_cumplimiento, pts_antiguedad, limite_sugerido, confianza)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
    `, [clienteId, nivelRiesgo, ptsPuntualidad, ptsHistorial, ptsCumplimiento, ptsAntiguedad, limiteSugerido]);
  }
}

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
    const puntajeTotal = calcularPuntaje(s);

    let recomendacion;
    let mensaje;

    if (s.nivel_riesgo === 'bajo') {
      recomendacion = 'aprobar';
      mensaje = `El cliente tiene un excelente historial con ${puntajeTotal} puntos. Es muy recomendable aprobar nuevos créditos.`;
    } else if (s.nivel_riesgo === 'medio') {
      recomendacion = 'con_precaucion';
      mensaje = `El cliente tiene ${puntajeTotal} puntos y un nivel de riesgo ${s.nivel_riesgo}. Se recomienda aprobar con monitoreo regular.`;
    } else {
      recomendacion = 'rechazar';
      mensaje = `Con solo ${puntajeTotal} puntos y nivel de riesgo ${s.nivel_riesgo}, el cliente presenta alto riesgo de mora. No se recomienda aprobar nuevos créditos en este momento.`;
    }

    // Si confianza es NULL, intentar obtener predicción ML en caliente
    if (!s.confianza) {
      try {
        const rf = await callMLService(clienteId);
        await pool.query(`
          UPDATE scoring
          SET nivel_riesgo = $1, confianza = $2
          WHERE id_scoring = (
            SELECT id_scoring FROM scoring WHERE id_cliente = $3 ORDER BY fecha_calculo DESC LIMIT 1
          )
        `, [rf.nivel_riesgo, rf.confianza, clienteId]);
        s.nivel_riesgo = rf.nivel_riesgo;
        s.confianza = rf.confianza;
      } catch (mlErr) {
        console.error('Error llamando al servicio ML:', mlErr.message);
      }
    }

    res.json({
      id_cliente: parseInt(clienteId),
      recomendacion,
      mensaje,
      puntaje: puntajeTotal,
      nivel_riesgo: s.nivel_riesgo,
      limite_sugerido: parseFloat(s.limite_sugerido),
      confianza: s.confianza ? parseFloat(s.confianza) : null
    });
  } catch (err) {
    console.error('Error en recomendación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

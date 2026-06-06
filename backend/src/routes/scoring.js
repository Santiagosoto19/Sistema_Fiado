const express = require('express');
const http = require('http');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { triggerMLRetrain } = require('../utils/mlTrigger');

const router = express.Router();
router.use(authMiddleware);

<<<<<<< HEAD
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
=======
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
>>>>>>> 19db70948a255a58fda682b80f1e9d129a852e19
}

// GET /api/scoring/:clienteId
// Lee directo de la tabla. Si no existe Y el cliente tiene historial, lo calcula y guarda.
router.get('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

<<<<<<< HEAD
    if (!(await verificarCliente(pool, idTendero, clienteId))) {
      return res.status(404).json({ error: 'Ese cliente no tiene ningún crédito asociado a esa tienda' });
=======
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
>>>>>>> 19db70948a255a58fda682b80f1e9d129a852e19
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
<<<<<<< HEAD
    res.json({
      id_cliente: clienteId,
      puntaje_total: s.puntaje,
=======
    const puntajeTotal = calcularPuntaje(s);

    res.json({
      id_cliente: parseInt(clienteId),
      puntaje_total: puntajeTotal,
>>>>>>> 19db70948a255a58fda682b80f1e9d129a852e19
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 19db70948a255a58fda682b80f1e9d129a852e19
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 19db70948a255a58fda682b80f1e9d129a852e19
    }

    res.json({
      id_cliente: clienteId,
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

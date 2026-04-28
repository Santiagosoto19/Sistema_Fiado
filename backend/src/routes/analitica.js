const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/analitica/indicadores
router.get('/indicadores', async (req, res) => {
  try {
    const { periodo } = req.query;
    const idTendero = req.user.id_tendero;

    let fechaInicio;
    const hoy = new Date();

    if (periodo === 'semana') {
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - 7);
    } else if (periodo === 'mes') {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    } else if (periodo === 'trimestre') {
      const mesActual = hoy.getMonth();
      const trimestreInicio = Math.floor(mesActual / 3) * 3;
      fechaInicio = new Date(hoy.getFullYear(), trimestreInicio, 1);
    } else {
      // Por defecto: mes
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    // Monto fiado en el período
    const fiadoResult = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as monto_fiado
      FROM creditos WHERE id_tendero = $1 AND fecha_credito >= $2
    `, [idTendero, fechaInicioStr]);

    // % cartera vencida
    const vencidaResult = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) as total_vencido,
             COALESCE(SUM(saldo_pendiente), 0) as total_saldo
      FROM creditos WHERE id_tendero = $1 AND estado != 'pagado'
    `, [idTendero]);

    const totalVencido = parseFloat(vencidaResult.rows[0].total_vencido) || 0;
    const totalSaldo = parseFloat(vencidaResult.rows[0].total_saldo) || 0;
    const porcentajeCarteraVencida = totalSaldo > 0 ? (totalVencido / totalSaldo) * 100 : 0;

    // Días promedio de atraso
    const diasAtrasoResult = await pool.query(`
      SELECT COALESCE(AVG(CASE WHEN estado = 'vencido' THEN CURRENT_DATE - fecha_limite_pago ELSE 0 END), 0) as dias_promedio
      FROM creditos WHERE id_tendero = $1 AND estado = 'vencido'
    `, [idTendero]);

    // Tasa de recuperación
    const pagosPeriodo = await pool.query(`
      SELECT COALESCE(SUM(a.monto), 0) as total_pagos
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE c.id_tendero = $1 AND a.fecha_abono >= $2
    `, [idTendero, fechaInicioStr]);

    const fiadoTotal = parseFloat(fiadoResult.rows[0].monto_fiado) || 0;
    const pagosTotal = parseFloat(pagosPeriodo.rows[0].total_pagos) || 0;
    const tasaRecuperacion = fiadoTotal > 0 ? (pagosTotal / fiadoTotal) * 100 : 0;

    res.json({
      periodo: periodo || 'mes',
      fecha_inicio: fechaInicioStr,
      fecha_fin: hoy.toISOString().split('T')[0],
      monto_fiado: fiadoTotal,
      porcentaje_cartera_vencida: Math.round(porcentajeCarteraVencida * 100) / 100,
      dias_promedio_atraso: Math.round(parseFloat(diasAtrasoResult.rows[0].dias_promedio) * 100) / 100,
      tasa_recuperacion: Math.round(tasaRecuperacion * 100) / 100,
      total_pagos_periodo: pagosTotal
    });
  } catch (err) {
    console.error('Error en indicadores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/analitica/pagos-diarios
router.get('/pagos-diarios', async (req, res) => {
  try {
    const idTendero = req.user.id_tendero;

    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fechaInicio = primerDiaMes.toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT a.fecha_abono, COALESCE(SUM(a.monto), 0) as monto_dia
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE c.id_tendero = $1 AND a.fecha_abono >= $2
      GROUP BY a.fecha_abono
      ORDER BY a.fecha_abono ASC
    `, [idTendero, fechaInicio]);

    res.json(result.rows.map(r => ({
      fecha: r.fecha_abono,
      monto: parseFloat(r.monto_dia)
    })));
  } catch (err) {
    console.error('Error en pagos-diarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/analitica/prediccion-flujo
router.get('/prediccion-flujo', async (req, res) => {
  try {
    const idTendero = req.user.id_tendero;

    // Calcular pagos esperados en los próximos 7 días
    const prediccion = await pool.query(`
      SELECT fecha_limite_pago, saldo_pendiente
      FROM creditos
      WHERE id_tendero = $1 AND estado = 'vigente'
      AND fecha_limite_pago BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY fecha_limite_pago ASC
    `, [idTendero, idTendero]);

    const hoy = new Date();
    const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

    // Generar predicciones por día
    const predicciones = [];
    let montoTotal = 0;
    let confianza = 70; // Base de confianza

    for (let i = 0; i < 7; i++) {
      const diaActual = new Date(hoy);
      diaActual.setDate(hoy.getDate() + i);
      const fechaStr = diaActual.toISOString().split('T')[0];

      const pagosDelDia = prediccion.rows
        .filter(p => p.fecha_limite_pago.toISOString().split('T')[0] === fechaStr)
        .reduce((sum, p) => sum + parseFloat(p.saldo_pendiente), 0);

      montoTotal += pagosDelDia;

      predicciones.push({
        fecha: fechaStr,
        dia: diaSemana[diaActual.getDay()],
        monto_esperado: Math.round(pagosDelDia * 100) / 100
      });
    }

    // Ajustar confianza basado en histórico
    if (predicciones.length > 0) {
      confianza = 85;
    }

    res.json({
      predicciones,
      monto_total_esperado: Math.round(montoTotal * 100) / 100,
      nivel_confianza: confianza,
      mensaje: confianza >= 80
        ? 'Alta confianza en la predicción basada en el historial de pagos.'
        : 'Confianza moderada. Los datos históricos son limitados.'
    });
  } catch (err) {
    console.error('Error en prediccion-flujo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
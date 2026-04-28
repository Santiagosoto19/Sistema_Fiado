const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/reportes
router.get('/', async (req, res) => {
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
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    // Resumen general
    const resumen = await pool.query(`
      SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(monto_total), 0) as monto_total,
             COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente
      FROM creditos WHERE id_tendero = $1 AND fecha_credito >= $2
      GROUP BY estado
    `, [idTendero, fechaInicioStr]);

    // Pagos del período
    const pagos = await pool.query(`
      SELECT COALESCE(SUM(a.monto), 0) as total_pagos, COUNT(*) as cantidad_pagos
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE c.id_tendero = $1 AND a.fecha_abono >= $2
    `, [idTendero, fechaInicioStr]);

    // Mora
    const mora = await pool.query(`
      SELECT COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) as monto_mora,
             COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as creditos_vencidos
      FROM creditos WHERE id_tendero = $1
    `, [idTendero]);

    // Tasa de recuperación
    const totalCartera = resumen.rows.reduce((sum, r) => sum + parseFloat(r.monto_total), 0);
    const totalPagos = parseFloat(pagos.rows[0].total_pagos) || 0;
    const tasaRecuperacion = totalCartera > 0 ? (totalPagos / totalCartera) * 100 : 0;

    // Top 3 deudores
    const topDeudores = await pool.query(`
      SELECT c.id_cliente, cl.nombre_completo, cl.telefono,
             COALESCE(SUM(cr.saldo_pendiente), 0) as total_deuda
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      WHERE cr.id_tendero = $1 AND cr.saldo_pendiente > 0
      GROUP BY c.id_cliente, cl.nombre_completo, cl.telefono
      ORDER BY total_deuda DESC
      LIMIT 3
    `, [idTendero]);

    res.json({
      periodo: periodo || 'mes',
      fecha_inicio: fechaInicioStr,
      fecha_fin: hoy.toISOString().split('T')[0],
      creditos: resumen.rows.map(r => ({
        estado: r.estado,
        cantidad: parseInt(r.cantidad),
        monto_total: parseFloat(r.monto_total),
        saldo_pendiente: parseFloat(r.saldo_pendiente)
      })),
      pagos: {
        total: totalPagos,
        cantidad: parseInt(pagos.rows[0].cantidad_pagos) || 0
      },
      mora: {
        monto: parseFloat(mora.rows[0].monto_mora) || 0,
        creditos_vencidos: parseInt(mora.rows[0].creditos_vencidos) || 0
      },
      tasa_recuperacion: Math.round(tasaRecuperacion * 100) / 100,
      top_deudores: topDeudores.rows.map(d => ({
        id_cliente: d.id_cliente,
        nombre: d.nombre_completo,
        telefono: d.telefono,
        total_deuda: parseFloat(d.total_deuda)
      }))
    });
  } catch (err) {
    console.error('Error en reportes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/export/pdf
router.get('/export/pdf', async (req, res) => {
  try {
    const { periodo } = req.query;
    const idTendero = req.user.id_tendero;

    const tenderoInfo = await pool.query(`
      SELECT * FROM tenderos WHERE id_tendero = $1
    `, [idTendero]);

    if (tenderoInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Tendero no encontrado' });
    }

    const tendero = tenderoInfo.rows[0];

    let fechaInicio;
    const hoy = new Date();

    if (periodo === 'semana') {
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - 7);
    } else if (periodo === 'trimestre') {
      const mesActual = hoy.getMonth();
      const trimestreInicio = Math.floor(mesActual / 3) * 3;
      fechaInicio = new Date(hoy.getFullYear(), trimestreInicio, 1);
    } else {
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }

    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    // Generar reporte completo
    const resumen = await pool.query(`
      SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(monto_total), 0) as monto_total,
             COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente
      FROM creditos WHERE id_tendero = $1 AND fecha_credito >= $2
      GROUP BY estado
    `, [idTendero, fechaInicioStr]);

    const mora = await pool.query(`
      SELECT COALESCE(SUM(saldo_pendiente), 0) as monto_mora
      FROM creditos WHERE id_tendero = $1 AND estado = 'vencido'
    `, [idTendero]);

    const topDeudores = await pool.query(`
      SELECT cl.nombre_completo, COALESCE(SUM(cr.saldo_pendiente), 0) as total_deuda
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      WHERE cr.id_tendero = $1 AND cr.saldo_pendiente > 0
      GROUP BY cl.nombre_completo
      ORDER BY total_deuda DESC LIMIT 3
    `, [idTendero]);

    // Generar contenido HTML para el PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte de Cartera</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #475569; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background-color: #2563eb; color: white; }
    tr:nth-child(even) { background-color: #f1f5f9; }
    .highlight { color: #dc2626; font-weight: bold; }
    .summary { background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .summary p { margin: 8px 0; }
    footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Reporte de Cartera</h1>
  <p><strong>Tendero:</strong> ${tendero.nombre}</p>
  <p><strong>Tienda:</strong> ${tendero.nombre_tienda}</p>
  <p><strong>Período:</strong> ${fechaInicioStr} al ${hoy.toISOString().split('T')[0]}</p>
  <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-CO')}</p>

  <div class="summary">
    <h2>Resumen Ejecutivo</h2>
    <p><strong>Total cartera:</strong> $${resumen.rows.reduce((sum, r) => sum + parseFloat(r.monto_total), 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
    <p class="highlight"><strong>Monto en mora:</strong> $${(parseFloat(mora.rows[0].monto_mora) || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</p>
    <p><strong>Total créditos:</strong> ${resumen.rows.reduce((sum, r) => sum + parseInt(r.cantidad), 0)}</p>
  </div>

  <h2>Estado de Créditos</h2>
  <table>
    <thead>
      <tr>
        <th>Estado</th>
        <th>Cantidad</th>
        <th>Monto Total</th>
        <th>Saldo Pendiente</th>
      </tr>
    </thead>
    <tbody>
      ${resumen.rows.map(r => `
        <tr>
          <td>${r.estado}</td>
          <td>${r.cantidad}</td>
          <td>$${parseFloat(r.monto_total).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
          <td>$${parseFloat(r.saldo_pendiente).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>Top 3 Deudores</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Cliente</th>
        <th>Deuda Total</th>
      </tr>
    </thead>
    <tbody>
      ${topDeudores.rows.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${d.nombre_completo}</td>
          <td class="highlight">$${parseFloat(d.total_deuda).toLocaleString('es-CO', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <footer>
    <p>Generado por FiadoCheck — Sistema de gestión de cartera</p>
  </footer>
</body>
</html>`;

    // Devolver como texto plano (en producción se usaría una librería PDF)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-cartera-${fechaInicioStr}-${hoy.toISOString().split('T')[0]}.html"`);
    res.send(htmlContent);
  } catch (err) {
    console.error('Error en export PDF:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
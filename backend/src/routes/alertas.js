const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/alertas
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    const idTendero = req.user.id_tendero;

    let query = `
      SELECT al.*, cl.nombre_completo as nombre_cliente, cr.monto_total, cr.saldo_pendiente
      FROM alertas al
      JOIN clientes cl ON al.id_cliente = cl.id_cliente
      JOIN creditos cr ON al.id_credito = cr.id_credito
      WHERE al.id_tendero = $1 AND al.leida = false
    `;
    const params = [idTendero];

    if (tipo === 'critica') {
      query += ` AND al.tipo = 'critica'`;
    } else if (tipo === 'proxima') {
      query += ` AND al.tipo = 'proxima'`;
    } else if (tipo === 'informativa') {
      query += ` AND al.tipo = 'informativa'`;
    }

    query += ` ORDER BY CASE al.tipo WHEN 'critica' THEN 1 WHEN 'proxima' THEN 2 WHEN 'informativa' THEN 3 END, al.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(a => ({
      id_alerta: a.id_alertas,
      id_cliente: a.id_cliente,
      id_credito: a.id_credito,
      nombre_cliente: a.nombre_cliente,
      tipo: a.tipo,
      dias_atraso: a.dias_atraso,
      monto_total: parseFloat(a.monto_total),
      saldo_pendiente: parseFloat(a.saldo_pendiente),
      leida: a.leida,
      created_at: a.created_at
    })));
  } catch (err) {
    console.error('Error en alertas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/alertas/:id/leer
router.patch('/:id/leer', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const alerta = await pool.query(`
      SELECT 1 FROM alertas WHERE id_alertas = $1 AND id_tendero = $2
    `, [id, idTendero]);

    if (alerta.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    await pool.query(
      'UPDATE alertas SET leida = true WHERE id_alertas = $1',
      [id]
    );

    res.json({ message: 'Alerta marcada como leída' });
  } catch (err) {
    console.error('Error al marcar alerta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
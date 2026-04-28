const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/abonos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const abono = await pool.query(`
      SELECT a.*, cr.monto_total, cr.saldo_pendiente, cr.descripcion as credito_descripcion,
             cl.nombre_completo as nombre_cliente
      FROM abonos a
      JOIN creditos cr ON a.id_credito = cr.id_credito
      JOIN clientes cl ON a.id_cliente = cl.id_cliente
      WHERE a.id_abono = $1 AND cr.id_tendero = $2
    `, [id, idTendero]);

    if (abono.rows.length === 0) {
      return res.status(404).json({ error: 'Abono no encontrado' });
    }

    const a = abono.rows[0];

    res.json({
      id_abono: a.id_abono,
      id_credito: a.id_credito,
      id_cliente: a.id_cliente,
      nombre_cliente: a.nombre_cliente,
      monto: parseFloat(a.monto),
      fecha_abono: a.fecha_abono,
      created_at: a.created_at,
      credito: {
        monto_total: parseFloat(a.monto_total),
        saldo_pendiente: parseFloat(a.saldo_pendiente),
        descripcion: a.credito_descripcion
      }
    });
  } catch (err) {
    console.error('Error al obtener abono:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
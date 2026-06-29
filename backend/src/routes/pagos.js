const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);
// GET /api/pagos?q=&periodo=todos|hoy|semana|mes
router.get('/', async (req, res) => {
try {
    const idTendero = req.user.id_tendero;
    if (!idTendero) {
    return res.status(403).json({ error: 'No tienes permisos para ver pagos' });
    }
    const { q = '', periodo = 'todos' } = req.query;
    const params = [idTendero];
    let paramIdx = 2;
    let periodoFilter = '';
    if (periodo === 'hoy') {
    periodoFilter = `AND a.fecha_abono::date = CURRENT_DATE`;
    } else if (periodo === 'semana') {
    periodoFilter = `AND a.fecha_abono >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (periodo === 'mes') {
    periodoFilter = `AND date_trunc('month', a.fecha_abono) = date_trunc('month',
CURRENT_DATE)`;
    }
    let searchFilter = '';
    if (q.trim()) {
    searchFilter = `AND (
        c.nombre_completo ILIKE $${paramIdx}
        OR COALESCE(cr.descripcion, '') ILIKE $${paramIdx}
        OR a.monto::text ILIKE $${paramIdx}
    )`;
    params.push(`%${q.trim()}%`);
    paramIdx++;
    }
    const result = await pool.query(`
    SELECT
        a.id_abono,
        a.monto,
        a.fecha_abono,
        a.created_at,
        c.id_cliente,
        c.nombre_completo,
        cr.id_credito,
        cr.descripcion,
        cr.estado AS estado_credito,
        cr.saldo_pendiente
    FROM abonos a
    JOIN creditos cr ON a.id_credito = cr.id_credito
    JOIN clientes c ON a.id_cliente = c.id_cliente
    WHERE cr.id_tendero = $1
    ${periodoFilter}
    ${searchFilter}
    ORDER BY a.fecha_abono DESC
    `, params);
    const pagos = result.rows.map((p) => ({
    id_abono: p.id_abono,
    monto: parseFloat(p.monto),
    fecha_abono: p.fecha_abono,
    created_at: p.created_at,
    cliente: {
        id_cliente: p.id_cliente,
        nombre_completo: p.nombre_completo,
    },
    credito: {
        id_credito: p.id_credito,
        descripcion: p.descripcion,
        estado: p.estado_credito,
        saldo_pendiente: parseFloat(p.saldo_pendiente),
    },
    }));
    const totalRecaudado = pagos.reduce((sum, p) => sum + p.monto, 0);
    res.json({
    total: pagos.length,
    total_recaudado: totalRecaudado,
    pagos,
    });
} catch (err) {
    console.error('Error en listar pagos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
}
});
module.exports = router;

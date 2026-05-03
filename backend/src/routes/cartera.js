const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/cartera
router.get('/', async (req, res) => {
  try {
    const idTendero = req.user.id_tendero;

    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a la cartera' });
    }

    // Totales por estado
    const resumen = await pool.query(`
      SELECT estado,
             COUNT(*) as total_creditos,
             COALESCE(SUM(monto_total), 0) as monto_total,
             COALESCE(SUM(saldo_pendiente), 0) as saldo_total
      FROM creditos
      WHERE id_tendero = $1
      GROUP BY estado
    `, [idTendero]);

    // Cartera vigentes vs vencidos
    const vigentes = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as monto, COALESCE(SUM(saldo_pendiente), 0) as saldo
      FROM creditos WHERE id_tendero = $1 AND estado = 'vigente'
    `, [idTendero]);

    const vencidos = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as monto, COALESCE(SUM(saldo_pendiente), 0) as saldo
      FROM creditos WHERE id_tendero = $1 AND estado = 'vencido'
    `, [idTendero]);

    res.json({
      vigentes: {
        monto_total: parseFloat(vigentes.rows[0].monto) || 0,
        saldo_pendiente: parseFloat(vigentes.rows[0].saldo) || 0
      },
      vencidos: {
        monto_total: parseFloat(vencidos.rows[0].monto) || 0,
        saldo_pendiente: parseFloat(vencidos.rows[0].saldo) || 0
      },
      por_estado: resumen.rows.map(r => ({
        estado: r.estado,
        total_creditos: parseInt(r.total_creditos) || 0,
        monto_total: parseFloat(r.monto_total) || 0,
        saldo_total: parseFloat(r.saldo_total) || 0
      }))
    });
  } catch (err) {
    console.error('Error en cartera:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/cartera/cliente/:clienteId
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    // Verificar que el cliente pertenece al tendero
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Totales del cliente
    const totales = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as cartera_total,
             COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente,
             COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) as monto_en_mora,
             COUNT(*) as total_creditos
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2
    `, [clienteId, idTendero]);

    // Detalle por crédito
    const creditos = await pool.query(`
      SELECT id_credito, monto_total, saldo_pendiente, descripcion,
             fecha_credito, fecha_limite_pago, estado, created_at
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2
      ORDER BY created_at DESC
    `, [clienteId, idTendero]);

    res.json({
      cliente_id: parseInt(clienteId),
      cartera_total: parseFloat(totales.rows[0].cartera_total) || 0,
      saldo_pendiente: parseFloat(totales.rows[0].saldo_pendiente) || 0,
      monto_en_mora: parseFloat(totales.rows[0].monto_en_mora) || 0,
      total_creditos: parseInt(totales.rows[0].total_creditos) || 0,
      creditos: creditos.rows.map(c => ({
        id_credito: c.id_credito,
        monto_total: parseFloat(c.monto_total),
        saldo_pendiente: parseFloat(c.saldo_pendiente),
        descripcion: c.descripcion,
        fecha_credito: c.fecha_credito,
        fecha_limite_pago: c.fecha_limite_pago,
        estado: c.estado,
        created_at: c.created_at
      }))
    });
  } catch (err) {
    console.error('Error en cartera cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/cartera/vencidos
router.get('/vencidos', async (req, res) => {
  try {
    const idTendero = req.user.id_tendero;

    // Clasificación por rango de días
    const hoy = new Date();

    const vencidos = await pool.query(`
      SELECT c.id_credito, c.id_cliente, cl.nombre_completo, cl.telefono,
             c.monto_total, c.saldo_pendiente, c.fecha_limite_pago, c.estado,
             CURRENT_DATE - c.fecha_limite_pago as dias_atraso
      FROM creditos c
      JOIN clientes cl ON c.id_cliente = cl.id_cliente
      WHERE c.id_tendero = $1 AND c.estado = 'vencido'
      ORDER BY dias_atraso DESC
    `, [idTendero]);

    const clasificacion = {
      '1_7_dias': [],
      '8_15_dias': [],
      'mas_15_dias': []
    };

    vencidos.rows.forEach(c => {
      const dias = parseInt(c.dias_atraso);
      const item = {
        id_credito: c.id_credito,
        id_cliente: c.id_cliente,
        nombre_cliente: c.nombre_completo,
        telefono: c.telefono,
        monto_total: parseFloat(c.monto_total),
        saldo_pendiente: parseFloat(c.saldo_pendiente),
        fecha_limite_pago: c.fecha_limite_pago,
        dias_atraso: dias
      };

      if (dias <= 7) {
        clasificacion['1_7_dias'].push(item);
      } else if (dias <= 15) {
        clasificacion['8_15_dias'].push(item);
      } else {
        clasificacion['mas_15_dias'].push(item);
      }
    });

    res.json({
      '1_7_dias': {
        cantidad: clasificacion['1_7_dias'].length,
        total_saldo: clasificacion['1_7_dias'].reduce((sum, c) => sum + c.saldo_pendiente, 0),
        creditos: clasificacion['1_7_dias']
      },
      '8_15_dias': {
        cantidad: clasificacion['8_15_dias'].length,
        total_saldo: clasificacion['8_15_dias'].reduce((sum, c) => sum + c.saldo_pendiente, 0),
        creditos: clasificacion['8_15_dias']
      },
      'mas_15_dias': {
        cantidad: clasificacion['mas_15_dias'].length,
        total_saldo: clasificacion['mas_15_dias'].reduce((sum, c) => sum + c.saldo_pendiente, 0),
        creditos: clasificacion['mas_15_dias']
      }
    });
  } catch (err) {
    console.error('Error en cartera vencidos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const { estado, q } = req.query;
    const idTendero = req.user.id_tendero;

    let query = `
      SELECT c.id_cliente, c.nombre_completo, c.telefono, c.direccion, c.estado, c.created_at,
             COALESCE(SUM(cr.saldo_pendiente), 0) as total_deuda,
             COUNT(cr.id_credito) as total_creditos
      FROM clientes c
      JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
      LEFT JOIN creditos cr ON c.id_cliente = cr.id_cliente AND cr.id_tendero = tc.id_tendero
      WHERE tc.id_tendero = $1 AND tc.estado = 'activo'
    `;
    const params = [idTendero];

    if (estado === 'mora') {
      query += ` AND EXISTS (SELECT 1 FROM creditos WHERE id_cliente = c.id_cliente AND id_tendero = $1 AND estado = 'vencido')`;
    } else if (estado === 'al_dia') {
      query += ` AND EXISTS (SELECT 1 FROM creditos WHERE id_cliente = c.id_cliente AND id_tendero = $1 AND estado = 'vigente') AND NOT EXISTS (SELECT 1 FROM creditos WHERE id_cliente = c.id_cliente AND id_tendero = $1 AND estado = 'vencido')`;
    } else if (estado === 'sin_deuda') {
      query += ` AND NOT EXISTS (SELECT 1 FROM creditos WHERE id_cliente = c.id_cliente AND id_tendero = $1 AND saldo_pendiente > 0)`;
    }

    if (q) {
      query += ` AND (c.nombre_completo ILIKE $${params.length + 1} OR c.id_cliente::text ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` GROUP BY c.id_cliente, c.nombre_completo, c.telefono, c.direccion, c.estado, c.created_at ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(c => ({
      id_cliente: c.id_cliente,
      nombre_completo: c.nombre_completo,
      telefono: c.telefono,
      direccion: c.direccion,
      estado: c.estado,
      created_at: c.created_at,
      total_deuda: parseFloat(c.total_deuda) || 0,
      total_creditos: parseInt(c.total_creditos) || 0
    })));
  } catch (err) {
    console.error('Error en listar clientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const cliente = await pool.query(`
      SELECT c.*, tc.estado as relacion_estado
      FROM clientes c
      JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
      WHERE c.id_cliente = $1 AND tc.id_tendero = $2
    `, [id, idTendero]);

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const totales = await pool.query(`
      SELECT COALESCE(SUM(saldo_pendiente), 0) as total_deuda,
             COUNT(*) as total_creditos,
             COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as creditos_vencidos
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2
    `, [id, idTendero]);

    const scoring = await pool.query(`
      SELECT * FROM scoring WHERE id_cliente = $1 ORDER BY fecha_calculo DESC LIMIT 1
    `, [id]);

    res.json({
      id_cliente: cliente.rows[0].id_cliente,
      nombre_completo: cliente.rows[0].nombre_completo,
      telefono: cliente.rows[0].telefono,
      direccion: cliente.rows[0].direccion,
      estado: cliente.rows[0].estado,
      created_at: cliente.rows[0].created_at,
      scoring: scoring.rows[0] ? {
        puntaje: scoring.rows[0].puntaje,
        nivel_riesgo: scoring.rows[0].nivel_riesgo,
        limite_sugerido: parseFloat(scoring.rows[0].limite_sugerido),
        fecha_calculo: scoring.rows[0].fecha_calculo
      } : null,
      totales: {
        total_deuda: parseFloat(totales.rows[0].total_deuda) || 0,
        total_creditos: parseInt(totales.rows[0].total_creditos) || 0,
        creditos_vencidos: parseInt(totales.rows[0].creditos_vencidos) || 0
      }
    });
  } catch (err) {
    console.error('Error en obtener cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, identificacion, telefono, direccion } = req.body;
    const idTendero = req.user.id_tendero;
    const idUsuario = req.user.id_usuario;

    if (!nombre || !identificacion || !telefono) {
      return res.status(400).json({ error: 'Nombre, identificación y teléfono son requeridos' });
    }

    await client.query('BEGIN');

    // Verificar si ya existe un cliente con la misma identificación
    const existe = await client.query(
      'SELECT id_cliente FROM clientes WHERE id_usuario = $1',
      [idUsuario]
    );

    let clienteId;
    if (existe.rows.length > 0) {
      // Cliente ya existe, solo crear la relación
      clienteId = existe.rows[0].id_cliente;
    } else {
      // Crear nuevo cliente
      const result = await client.query(`
        INSERT INTO clientes (id_usuario, nombre_completo, telefono, direccion)
        VALUES ($1, $2, $3, $4) RETURNING id_cliente
      `, [idUsuario, nombre, telefono, direccion]);
      clienteId = result.rows[0].id_cliente;
    }

    // Crear relación tendero-cliente
    await client.query(`
      INSERT INTO tendero_cliente (id_tendero, id_cliente)
      VALUES ($1, $2)
      ON CONFLICT (id_tendero, id_cliente) DO NOTHING
    `, [idTendero, clienteId]);

    await client.query('COMMIT');

    res.status(201).json({ message: 'Cliente creado correctamente', id_cliente: clienteId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, telefono, direccion, estado } = req.body;
    const idTendero = req.user.id_tendero;

    // Verificar pertenencia
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, id]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (nombre_completo) {
      updates.push(`nombre_completo = $${paramIndex++}`);
      values.push(nombre_completo);
    }
    if (telefono) {
      updates.push(`telefono = $${paramIndex++}`);
      values.push(telefono);
    }
    if (direccion) {
      updates.push(`direccion = $${paramIndex++}`);
      values.push(direccion);
    }
    if (estado) {
      updates.push(`estado = $${paramIndex++}`);
      values.push(estado);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
    }

    values.push(id);
    await pool.query(
      `UPDATE clientes SET ${updates.join(', ')} WHERE id_cliente = $${paramIndex}`,
      values
    );

    res.json({ message: 'Cliente actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id/historial
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, id]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const creditos = await pool.query(`
      SELECT c.*,
             (SELECT COALESCE(SUM(monto), 0) FROM abonos WHERE id_credito = c.id_credito) as total_abonado
      FROM creditos c
      WHERE c.id_cliente = $1 AND c.id_tendero = $2
      ORDER BY c.fecha_credito DESC
    `, [id, idTendero]);

    const historial = [];

    for (const credito of creditos.rows) {
      const abonos = await pool.query(`
        SELECT id_abono, monto, fecha_abono, created_at
        FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
      `, [credito.id_credito]);

      historial.push({
        credito: {
          id_credito: credito.id_credito,
          monto_total: parseFloat(credito.monto_total),
          saldo_pendiente: parseFloat(credito.saldo_pendiente),
          descripcion: credito.descripcion,
          fecha_credito: credito.fecha_credito,
          fecha_limite_pago: credito.fecha_limite_pago,
          estado: credito.estado,
          created_at: credito.created_at
        },
        total_abonado: parseFloat(credito.total_abonado),
        abonos: abonos.rows.map(a => ({
          id_abono: a.id_abono,
          monto: parseFloat(a.monto),
          fecha_abono: a.fecha_abono,
          created_at: a.created_at
        }))
      });
    }

    res.json({ cliente_id: parseInt(id), historial });
  } catch (err) {
    console.error('Error en historial:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id/pagos
router.get('/:id/pagos', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, id]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const pagos = await pool.query(`
      SELECT a.id_abono, a.monto, a.fecha_abono, a.created_at,
             c.id_credito, c.monto_total, c.saldo_pendiente, c.descripcion
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE a.id_cliente = $1 AND c.id_tendero = $2
      ORDER BY a.fecha_abono DESC
    `, [id, idTendero]);

    res.json({
      cliente_id: parseInt(id),
      pagos: pagos.rows.map(p => ({
        id_abono: p.id_abono,
        monto: parseFloat(p.monto),
        fecha_abono: p.fecha_abono,
        created_at: p.created_at,
        credito: {
          id_credito: p.id_credito,
          monto_total: parseFloat(p.monto_total),
          saldo_pendiente: parseFloat(p.saldo_pendiente),
          descripcion: p.descripcion
        }
      }))
    });
  } catch (err) {
    console.error('Error en pagos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
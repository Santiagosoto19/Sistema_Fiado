const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/creditos
router.get('/', async (req, res) => {
  try {
    const { clienteId, estado } = req.query;
    const idTendero = req.user.id_tendero;

    let query = `
      SELECT cr.*, cl.nombre_completo as nombre_cliente, cl.telefono
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      WHERE cr.id_tendero = $1
    `;
    const params = [idTendero];

    if (clienteId) {
      query += ` AND cr.id_cliente = $${params.length + 1}`;
      params.push(clienteId);
    }

    if (estado) {
      query += ` AND cr.estado = $${params.length + 1}`;
      params.push(estado);
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(c => ({
      id_credito: c.id_credito,
      id_cliente: c.id_cliente,
      nombre_cliente: c.nombre_cliente,
      telefono: c.telefono,
      monto_total: parseFloat(c.monto_total),
      saldo_pendiente: parseFloat(c.saldo_pendiente),
      descripcion: c.descripcion,
      fecha_credito: c.fecha_credito,
      fecha_limite_pago: c.fecha_limite_pago,
      estado: c.estado,
      created_at: c.created_at
    })));
  } catch (err) {
    console.error('Error en listar créditos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/creditos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(`
      SELECT cr.*, cl.nombre_completo as nombre_cliente, cl.telefono, cl.direccion
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      WHERE cr.id_credito = $1 AND cr.id_tendero = $2
    `, [id, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const c = credito.rows[0];
    const diasAtraso = c.estado === 'vencido'
      ? Math.max(0, Math.floor((new Date() - new Date(c.fecha_limite_pago)) / (1000 * 60 * 60 * 24)))
      : 0;

    const abonos = await pool.query(`
      SELECT id_abono, monto, fecha_abono, created_at
      FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
    `, [id]);

    const totalAbonado = abonos.rows.reduce((sum, a) => sum + parseFloat(a.monto), 0);

    res.json({
      id_credito: c.id_credito,
      id_cliente: c.id_cliente,
      nombre_cliente: c.nombre_cliente,
      telefono: c.telefono,
      direccion: c.direccion,
      monto_total: parseFloat(c.monto_total),
      saldo_pendiente: parseFloat(c.saldo_pendiente),
      total_abonado: totalAbonado,
      descripcion: c.descripcion,
      fecha_credito: c.fecha_credito,
      fecha_limite_pago: c.fecha_limite_pago,
      estado: c.estado,
      dias_atraso: diasAtraso,
      created_at: c.created_at,
      abonos: abonos.rows.map(a => ({
        id_abono: a.id_abono,
        monto: parseFloat(a.monto),
        fecha_abono: a.fecha_abono,
        created_at: a.created_at
      }))
    });
  } catch (err) {
    console.error('Error en obtener crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/creditos
router.post('/', async (req, res) => {
  try {
    const { clienteId, montoTotal, descripcion, fechaLimitePago } = req.body;
    const idTendero = req.user.id_tendero;

    if (!clienteId || !montoTotal || !fechaLimitePago) {
      return res.status(400).json({ error: 'clienteId, montoTotal y fechaLimitePago son requeridos' });
    }

    // Verificar que el cliente pertenece al tendero
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const fechaCredito = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      INSERT INTO creditos (id_cliente, id_tendero, monto_total, saldo_pendiente, descripcion, fecha_credito, fecha_limite_pago, estado)
      VALUES ($1, $2, $3, $3, $4, $5, $6, 'vigente')
      RETURNING id_credito
    `, [clienteId, idTendero, montoTotal, descripcion || '', fechaCredito, fechaLimitePago]);

    res.status(201).json({
      message: 'Crédito registrado correctamente',
      id_credito: result.rows[0].id_credito
    });
  } catch (err) {
    console.error('Error al registrar crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/creditos/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(`
      SELECT 1 FROM creditos WHERE id_credito = $1 AND id_tendero = $2
    `, [id, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    if (!estado || !['vigente', 'pagado', 'vencido'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Valores válidos: vigente, pagado, vencido' });
    }

    await pool.query(
      'UPDATE creditos SET estado = $1 WHERE id_credito = $2',
      [estado, id]
    );

    res.json({ message: 'Estado del crédito actualizado' });
  } catch (err) {
    console.error('Error al actualizar crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/creditos/cliente/:clienteId
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const creditos = await pool.query(`
      SELECT id_credito, monto_total, saldo_pendiente, descripcion,
             fecha_credito, fecha_limite_pago, estado, created_at
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
      ORDER BY created_at DESC
    `, [clienteId, idTendero]);

    res.json({
      cliente_id: parseInt(clienteId),
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
    console.error('Error en créditos por cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/creditos/:creditoId/abonos
router.post('/:creditoId/abonos', async (req, res) => {
  try {
    const { creditoId } = req.params;
    const { monto, fechaAbono } = req.body;
    const idTendero = req.user.id_tendero;

    if (!monto || !fechaAbono) {
      return res.status(400).json({ error: 'monto y fechaAbono son requeridos' });
    }

    if (parseFloat(monto) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    // Verificar que el crédito existe y pertenece al tendero
    const credito = await pool.query(`
      SELECT * FROM creditos WHERE id_credito = $1 AND id_tendero = $2
    `, [creditoId, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const c = credito.rows[0];
    const nuevoSaldo = parseFloat(c.saldo_pendiente) - parseFloat(monto);

    await pool.connect().then(async client => {
      try {
        await client.query('BEGIN');

        // Registrar abono
        const abonoResult = await client.query(`
          INSERT INTO abonos (id_credito, id_cliente, monto, fecha_abono)
          VALUES ($1, $2, $3, $4) RETURNING id_abono
        `, [creditoId, c.id_cliente, monto, fechaAbono]);

        // Actualizar saldo y estado del crédito
        const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : c.estado;
        const saldoFinal = Math.max(0, nuevoSaldo);

        await client.query(`
          UPDATE creditos SET saldo_pendiente = $1, estado = $2 WHERE id_credito = $3
        `, [saldoFinal, nuevoEstado, creditoId]);

        await client.query('COMMIT');

        res.status(201).json({
          message: 'Abono registrado correctamente',
          id_abono: abonoResult.rows[0].id_abono,
          saldo_anterior: parseFloat(c.saldo_pendiente),
          saldo_nuevo: saldoFinal,
          estado_credito: nuevoEstado
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  } catch (err) {
    console.error('Error al registrar abono:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/creditos/:creditoId/abonos
router.get('/:creditoId/abonos', async (req, res) => {
  try {
    const { creditoId } = req.params;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(`
      SELECT 1 FROM creditos WHERE id_credito = $1 AND id_tendero = $2
    `, [creditoId, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const abonos = await pool.query(`
      SELECT id_abono, monto, fecha_abono, created_at
      FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
    `, [creditoId]);

    const totalAbonado = abonos.rows.reduce((sum, a) => sum + parseFloat(a.monto), 0);

    res.json({
      credito_id: parseInt(creditoId),
      total_abonado: totalAbonado,
      abonos: abonos.rows.map(a => ({
        id_abono: a.id_abono,
        monto: parseFloat(a.monto),
        fecha_abono: a.fecha_abono,
        created_at: a.created_at
      }))
    });
  } catch (err) {
    console.error('Error al listar abonos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
/**
 * Acceso a datos del módulo de créditos relacionado con el registro de pagos
 * (abonos). No contiene lógica de negocio: solo queries SQL.
 */

const pool = require('../../config/database');

const lockCreditoById = async (client, idCredito, idTendero) => {
  const result = await client.query(
    `SELECT id_credito, id_cliente, id_tendero, monto_total, saldo_pendiente,
            estado, fecha_credito, fecha_limite_pago
     FROM creditos
     WHERE id_credito = $1 AND id_tendero = $2
     FOR UPDATE`,
    [idCredito, idTendero]
  );
  return result.rows[0] || null;
};

const insertAbono = async (client, { idCredito, idCliente, monto, fechaAbono }) => {
  const result = await client.query(
    `INSERT INTO abonos (id_credito, id_cliente, monto, fecha_abono)
     VALUES ($1, $2, $3, $4)
     RETURNING id_abono, monto, fecha_abono, created_at`,
    [idCredito, idCliente, monto, fechaAbono]
  );
  return result.rows[0];
};

const actualizarSaldoCredito = async (client, { idCredito, idTendero, saldoNuevo, estado }) => {
  const result = await client.query(
    `UPDATE creditos
     SET saldo_pendiente = $1, estado = $2
     WHERE id_credito = $3 AND id_tendero = $4
     RETURNING id_credito, saldo_pendiente, estado`,
    [saldoNuevo, estado, idCredito, idTendero]
  );
  return result;
};

const getClient = () => pool.connect();

module.exports = {
  lockCreditoById,
  insertAbono,
  actualizarSaldoCredito,
  getClient,
};

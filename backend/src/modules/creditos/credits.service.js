/**
 * Lógica de negocio del registro de abonos (pagos) sobre un crédito.
 */

const AppError = require('../../utils/AppError');
const { triggerMLRetrain } = require('../../utils/mlTrigger');
const creditsRepository = require('./credits.repository');

const round2 = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

const validarConsistenciaPago = (credito, monto, fechaAbono) => {
  const montoNum = Number(monto);

  if (monto === undefined || monto === null || Number.isNaN(montoNum)) {
    throw new AppError('El monto del abono es inválido', 400);
  }

  if (montoNum <= 0) {
    throw new AppError('El monto debe ser mayor a 0', 400);
  }

  if (round2(montoNum) !== montoNum) {
    throw new AppError('El monto no puede tener más de 2 decimales', 400);
  }

  if (credito.estado === 'pagado') {
    throw new AppError('Este crédito ya está pagado en su totalidad', 409);
  }

  const saldoPendiente = round2(parseFloat(credito.saldo_pendiente));

  if (montoNum > saldoPendiente) {
    throw new AppError(
      `El monto del abono ($${montoNum}) supera el saldo pendiente ($${saldoPendiente})`,
      409
    );
  }

  if (!fechaAbono || Number.isNaN(new Date(fechaAbono).getTime())) {
    throw new AppError('La fecha del abono es inválida', 400);
  }

  const fAbono = new Date(fechaAbono);
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  if (fAbono.getTime() > hoy.getTime()) {
    throw new AppError('La fecha del abono no puede ser futura', 400);
  }

  const fCredito = new Date(credito.fecha_credito);
  if (fAbono.getTime() < fCredito.getTime()) {
    throw new AppError('La fecha del abono no puede ser anterior a la fecha del crédito', 400);
  }

  return montoNum;
};

const registrarPago = async ({ creditoId, idTendero, monto, fechaAbono }) => {
  const client = await creditsRepository.getClient();

  try {
    await client.query('BEGIN');

    const credito = await creditsRepository.lockCreditoById(client, creditoId, idTendero);

    if (!credito) {
      throw new AppError('Crédito no encontrado', 404);
    }

    const montoValidado = validarConsistenciaPago(credito, monto, fechaAbono);

    const saldoAnterior = round2(parseFloat(credito.saldo_pendiente));
    const saldoNuevo = Math.max(0, round2(saldoAnterior - montoValidado));
    const estadoNuevo = saldoNuevo === 0 ? 'pagado' : credito.estado;

    const abono = await creditsRepository.insertAbono(client, {
      idCredito: credito.id_credito,
      idCliente: credito.id_cliente,
      monto: montoValidado,
      fechaAbono,
    });

    const updateResult = await creditsRepository.actualizarSaldoCredito(client, {
      idCredito: credito.id_credito,
      idTendero,
      saldoNuevo,
      estado: estadoNuevo,
    });

    if (updateResult.rowCount !== 1) {
      throw new AppError('No se pudo actualizar el saldo del crédito', 500);
    }

    await client.query('COMMIT');

    if (estadoNuevo === 'pagado') {
      triggerMLRetrain('credito_pagado').catch(() => {});
    }

    return {
      id_abono: abono.id_abono,
      saldo_anterior: saldoAnterior,
      saldo_nuevo: saldoNuevo,
      estado_credito: estadoNuevo,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  validarConsistenciaPago,
  registrarPago,
};

/**
 * analytics.repository.js
 * Solo queries SQL — sin lógica de negocio.
 */

const pool = require('../../config/database');

const getResumenCreditos = async (idTendero, fechaInicioStr) => {
  const result = await pool.query(
    `SELECT estado,
            COUNT(*)                          AS cantidad,
            COALESCE(SUM(monto_total), 0)     AS monto_total,
            COALESCE(SUM(saldo_pendiente), 0) AS saldo_pendiente
     FROM creditos
     WHERE id_tendero = $1 AND fecha_credito >= $2
     GROUP BY estado`,
    [idTendero, fechaInicioStr]
  );
  return result.rows;
};

const getTotalPagosPeriodo = async (idTendero, fechaInicioStr) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(a.monto), 0) AS total_pagos,
            COUNT(*)                  AS cantidad_pagos
     FROM abonos a
     JOIN creditos c ON a.id_credito = c.id_credito
     WHERE c.id_tendero = $1 AND a.fecha_abono >= $2`,
    [idTendero, fechaInicioStr]
  );
  return result.rows[0];
};

const getMora = async (idTendero) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) AS monto_mora,
            COUNT(CASE WHEN estado = 'vencido' THEN 1 END)                                 AS creditos_vencidos
     FROM creditos
     WHERE id_tendero = $1`,
    [idTendero]
  );
  return result.rows[0];
};

/** Clientes distintos con créditos otorgados en el período. */
const getClientesActivosPeriodo = async (idTendero, fechaInicioStr, fechaFinStr) => {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT id_cliente) AS clientes_activos
     FROM creditos
     WHERE id_tendero = $1
       AND fecha_credito >= $2
       AND fecha_credito <= $3`,
    [idTendero, fechaInicioStr, fechaFinStr]
  );
  return result.rows[0];
};

/**
 * Clientes que entraron en mora durante el período:
 * créditos vencidos cuya fecha límite de pago cae dentro del rango.
 */
const getNuevosEnMoraPeriodo = async (idTendero, fechaInicioStr, fechaFinStr) => {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT id_cliente) AS clientes_nuevos_en_mora
     FROM creditos
     WHERE id_tendero = $1
       AND estado = 'vencido'
       AND fecha_limite_pago >= $2
       AND fecha_limite_pago <= $3`,
    [idTendero, fechaInicioStr, fechaFinStr]
  );
  return result.rows[0];
};

const getTopDeudores = async (idTendero, limite = 3) => {
  const result = await pool.query(
    `SELECT cr.id_cliente,
            cl.nombre_completo,
            cl.telefono,
            COALESCE(SUM(cr.saldo_pendiente), 0) AS total_deuda
     FROM creditos cr
     JOIN clientes cl ON cr.id_cliente = cl.id_cliente
     WHERE cr.id_tendero = $1 AND cr.saldo_pendiente > 0
     GROUP BY cr.id_cliente, cl.nombre_completo, cl.telefono
     ORDER BY total_deuda DESC
     LIMIT $2`,
    [idTendero, limite]
  );
  return result.rows;
};

const getMontoFiado = async (idTendero, fechaInicioStr) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(monto_total), 0) AS monto_fiado
     FROM creditos
     WHERE id_tendero = $1 AND fecha_credito >= $2`,
    [idTendero, fechaInicioStr]
  );
  return result.rows[0];
};

const getCarteraVencida = async (idTendero) => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) AS total_vencido,
            COALESCE(SUM(saldo_pendiente), 0)                                               AS total_saldo
     FROM creditos
     WHERE id_tendero = $1 AND estado != 'pagado'`,
    [idTendero]
  );
  return result.rows[0];
};

const getDiasPromedioAtraso = async (idTendero) => {
  const result = await pool.query(
    `SELECT COALESCE(AVG(CURRENT_DATE - fecha_limite_pago), 0) AS dias_promedio
     FROM creditos
     WHERE id_tendero = $1 AND estado = 'vencido'`,
    [idTendero]
  );
  return result.rows[0];
};

const getPagosDiarios = async (idTendero, fechaInicioStr) => {
  const result = await pool.query(
    `SELECT a.fecha_abono,
            COALESCE(SUM(a.monto), 0) AS monto_dia
     FROM abonos a
     JOIN creditos c ON a.id_credito = c.id_credito
     WHERE c.id_tendero = $1 AND a.fecha_abono >= $2
     GROUP BY a.fecha_abono
     ORDER BY a.fecha_abono ASC`,
    [idTendero, fechaInicioStr]
  );
  return result.rows;
};

const getCreditosVigentesPorVencer = async (idTendero) => {
  const result = await pool.query(
    `SELECT fecha_limite_pago, saldo_pendiente
     FROM creditos
     WHERE id_tendero = $1
       AND estado = 'vigente'
       AND fecha_limite_pago BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
     ORDER BY fecha_limite_pago ASC`,
    [idTendero]
  );
  return result.rows;
};

const getTenderoById = async (idTendero) => {
  const result = await pool.query(
    'SELECT * FROM tenderos WHERE id_tendero = $1',
    [idTendero]
  );
  return result.rows[0] || null;
};

module.exports = {
  getResumenCreditos,
  getTotalPagosPeriodo,
  getMora,
  getClientesActivosPeriodo,
  getNuevosEnMoraPeriodo,
  getTopDeudores,
  getMontoFiado,
  getCarteraVencida,
  getDiasPromedioAtraso,
  getPagosDiarios,
  getCreditosVigentesPorVencer,
  getTenderoById,
};

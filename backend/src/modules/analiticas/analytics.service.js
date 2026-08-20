/**
 * analytics.service.js
 * Lógica de negocio del módulo analytics/reportes.
 */

const AppError = require('../../utils/AppError');
const repo = require('./analytics.repository');

const PERIODOS_VALIDOS = ['semana', 'mes', 'trimestre', 'aldia'];

const calcularFechaInicio = (periodo) => {
  const hoy = new Date();

  if (periodo === 'semana') {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - 7);
    return d;
  }
  if (periodo === 'aldia') {
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  }
  if (periodo === 'trimestre') {
    const trimestreInicio = Math.floor(hoy.getMonth() / 3) * 3;
    return new Date(hoy.getFullYear(), trimestreInicio, 1);
  }
  // Por defecto: mes actual
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
};

const validarPeriodo = (periodo) => {
  if (periodo && !PERIODOS_VALIDOS.includes(periodo)) {
    throw new AppError(
      `Período inválido. Valores permitidos: ${PERIODOS_VALIDOS.join(', ')}`,
      400
    );
  }
  return periodo || 'mes';
};

const getReporte = async (idTendero, periodoRaw) => {
  const periodo = validarPeriodo(periodoRaw);
  const hoy = new Date();
  const fechaInicio = calcularFechaInicio(periodo);
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
  const fechaFinStr = hoy.toISOString().split('T')[0];

  const [resumenRows, pagosRow, moraRow, nuevosMoraRow, clientesActivosRow, topDeudoresRows] =
    await Promise.all([
      repo.getResumenCreditos(idTendero, fechaInicioStr),
      repo.getTotalPagosPeriodo(idTendero, fechaInicioStr),
      repo.getMora(idTendero),
      repo.getNuevosEnMoraPeriodo(idTendero, fechaInicioStr, fechaFinStr),
      repo.getClientesActivosPeriodo(idTendero, fechaInicioStr, fechaFinStr),
      repo.getTopDeudores(idTendero, 3),
    ]);

  const totalCartera = resumenRows.reduce((s, r) => s + parseFloat(r.monto_total), 0);
  const totalPagos = parseFloat(pagosRow.total_pagos) || 0;
  const tasaRecuperacion =
    totalCartera > 0 ? Math.round((totalPagos / totalCartera) * 10000) / 100 : 0;

  return {
    periodo,
    fecha_inicio: fechaInicioStr,
    fecha_fin: hoy.toISOString().split('T')[0],
    creditos: resumenRows.map((r) => ({
      estado: r.estado,
      cantidad: parseInt(r.cantidad),
      monto_total: parseFloat(r.monto_total),
      saldo_pendiente: parseFloat(r.saldo_pendiente),
    })),
    pagos: {
      total: totalPagos,
      cantidad: parseInt(pagosRow.cantidad_pagos) || 0,
    },
    mora: {
      monto: parseFloat(moraRow.monto_mora) || 0,
      creditos_vencidos: parseInt(moraRow.creditos_vencidos) || 0,
      clientes_nuevos_en_mora: parseInt(nuevosMoraRow.clientes_nuevos_en_mora) || 0,
    },
    clientes_activos: parseInt(clientesActivosRow.clientes_activos) || 0,
    tasa_recuperacion: tasaRecuperacion,
    top_deudores: topDeudoresRows.map((d) => ({
      id_cliente: d.id_cliente,
      nombre: d.nombre_completo,
      telefono: d.telefono,
      total_deuda: parseFloat(d.total_deuda),
    })),
  };
};

const getIndicadores = async (idTendero, periodoRaw) => {
  const periodo = validarPeriodo(periodoRaw);
  const hoy = new Date();
  const fechaInicio = calcularFechaInicio(periodo);
  const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

  const [fiadoRow, carteraRow, diasRow, pagosRow] = await Promise.all([
    repo.getMontoFiado(idTendero, fechaInicioStr),
    repo.getCarteraVencida(idTendero),
    repo.getDiasPromedioAtraso(idTendero),
    repo.getTotalPagosPeriodo(idTendero, fechaInicioStr),
  ]);

  const totalVencido = parseFloat(carteraRow.total_vencido) || 0;
  const totalSaldo = parseFloat(carteraRow.total_saldo) || 0;
  const montoFiado = parseFloat(fiadoRow.monto_fiado) || 0;
  const pagosTotal = parseFloat(pagosRow.total_pagos) || 0;

  const porcentajeCarteraVencida =
    totalSaldo > 0 ? Math.round((totalVencido / totalSaldo) * 10000) / 100 : 0;
  const tasaRecuperacion =
    montoFiado > 0 ? Math.round((pagosTotal / montoFiado) * 10000) / 100 : 0;

  return {
    periodo,
    fecha_inicio: fechaInicioStr,
    fecha_fin: hoy.toISOString().split('T')[0],
    monto_fiado: montoFiado,
    porcentaje_cartera_vencida: porcentajeCarteraVencida,
    dias_promedio_atraso: Math.round(parseFloat(diasRow.dias_promedio) * 100) / 100,
    tasa_recuperacion: tasaRecuperacion,
    total_pagos_periodo: pagosTotal,
  };
};

const getPagosDiarios = async (idTendero) => {
  const hoy = new Date();
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fechaInicioStr = primerDia.toISOString().split('T')[0];

  const rows = await repo.getPagosDiarios(idTendero, fechaInicioStr);
  return rows.map((r) => ({
    fecha: r.fecha_abono,
    monto: parseFloat(r.monto_dia),
  }));
};

const getPrediccionFlujo = async (idTendero) => {
  const hoy = new Date();
  const rows = await repo.getCreditosVigentesPorVencer(idTendero);
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

  let montoTotal = 0;
  const predicciones = [];

  for (let i = 0; i < 7; i++) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() + i);
    const fechaStr = dia.toISOString().split('T')[0];

    const montoDia = rows
      .filter((p) => {
        const f = p.fecha_limite_pago instanceof Date
          ? p.fecha_limite_pago
          : new Date(p.fecha_limite_pago);
        return f.toISOString().split('T')[0] === fechaStr;
      })
      .reduce((s, p) => s + parseFloat(p.saldo_pendiente), 0);

    montoTotal += montoDia;
    predicciones.push({
      fecha: fechaStr,
      dia: dias[dia.getDay()],
      monto_esperado: Math.round(montoDia * 100) / 100,
    });
  }

  const nivelConfianza = rows.length > 0 ? 85 : 70;

  return {
    predicciones,
    monto_total_esperado: Math.round(montoTotal * 100) / 100,
    nivel_confianza: nivelConfianza,
    mensaje:
      nivelConfianza >= 80
        ? 'Alta confianza en la predicción basada en el historial de pagos.'
        : 'Confianza moderada. Los datos históricos son limitados.',
  };
};

const generarReporteHTML = async (idTendero, periodoRaw) => {
  const periodo = validarPeriodo(periodoRaw);

  const tendero = await repo.getTenderoById(idTendero);
  if (!tendero) throw new AppError('Tendero no encontrado', 404);

  const reporte = await getReporte(idTendero, periodo);

  const totalCartera = reporte.creditos.reduce((s, r) => s + r.monto_total, 0);
  const fmtCOP = (v) =>
    `$${v.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Cartera</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1A1A2E; }
    h1   { color: #00C48C; border-bottom: 2px solid #00C48C; padding-bottom: 10px; }
    h2   { color: #475569; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #E0E0E0; padding: 10px; text-align: left; }
    th { background-color: #00C48C; color: #fff; }
    tr:nth-child(even) { background-color: #EEF2F1; }
    .summary { background-color: #EEF2F1; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .mora { color: #E53935; font-weight: bold; }
    footer { margin-top: 50px; text-align: center; color: #9E9E9E; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Reporte de Cartera — FiadoCheck</h1>
  <p><strong>Tendero:</strong> ${tendero.nombre}</p>
  <p><strong>Tienda:</strong> ${tendero.nombre_tienda}</p>
  <p><strong>Período:</strong> ${reporte.fecha_inicio} al ${reporte.fecha_fin}</p>
  <p><strong>Generado:</strong> ${new Date().toLocaleString('es-CO')}</p>

  <div class="summary">
    <h2>Resumen</h2>
    <p><strong>Total cartera:</strong> ${fmtCOP(totalCartera)}</p>
    <p class="mora"><strong>Monto en mora:</strong> ${fmtCOP(reporte.mora.monto)}</p>
    <p><strong>Total pagos del período:</strong> ${fmtCOP(reporte.pagos.total)}</p>
    <p><strong>Tasa de recuperación:</strong> ${reporte.tasa_recuperacion}%</p>
    <p><strong>Clientes activos (período):</strong> ${reporte.clientes_activos}</p>
    <p class="mora"><strong>Nuevos en mora (período):</strong> ${reporte.mora.clientes_nuevos_en_mora} clientes</p>
    <p><strong>Total créditos:</strong> ${reporte.creditos.reduce((s, r) => s + r.cantidad, 0)}</p>
  </div>

  <h2>Estado de Créditos</h2>
  <table>
    <thead>
      <tr><th>Estado</th><th>Cantidad</th><th>Monto Total</th><th>Saldo Pendiente</th></tr>
    </thead>
    <tbody>
      ${reporte.creditos
        .map(
          (r) => `<tr>
        <td>${r.estado}</td>
        <td>${r.cantidad}</td>
        <td>${fmtCOP(r.monto_total)}</td>
        <td>${fmtCOP(r.saldo_pendiente)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Top 3 Deudores</h2>
  <table>
    <thead>
      <tr><th>#</th><th>Cliente</th><th>Teléfono</th><th>Deuda Total</th></tr>
    </thead>
    <tbody>
      ${reporte.top_deudores
        .map(
          (d, i) => `<tr>
        <td>${i + 1}</td>
        <td>${d.nombre}</td>
        <td>${d.telefono}</td>
        <td class="mora">${fmtCOP(d.total_deuda)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <footer>Generado por FiadoCheck — Sistema de gestión de cartera</footer>
</body>
</html>`;

  return { html, fechaInicio: reporte.fecha_inicio, fechaFin: reporte.fecha_fin };
};

module.exports = {
  getReporte,
  getIndicadores,
  getPagosDiarios,
  getPrediccionFlujo,
  generarReporteHTML,
};

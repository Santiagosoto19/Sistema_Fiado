function calcularPuntaje(row, options = {}) {
  const sum =
    (row.pts_puntualidad || 0) +
    (row.pts_cumplimiento || 0) +
    (row.pts_historial || 0) +
    (row.pts_antiguedad || 0);

  // Cliente sin créditos con este tendero: puntaje neutral por reglas de negocio
  if (options.sinHistorialCrediticio) return 50;

  // Fallback legacy: pts en 0 y nivel medio antes de sobrescritura ML
  if (sum === 0 && row.nivel_riesgo === 'medio') return 50;

  return sum;
}

function mapScoringRow(row, options = {}) {
  return {
    puntaje: calcularPuntaje(row, options),
    nivel_riesgo: row.nivel_riesgo,
    limite_sugerido: parseFloat(row.limite_sugerido),
    confianza: row.confianza != null ? parseFloat(row.confianza) : null,
    fecha_calculo: row.fecha_calculo,
    desglose: {
      puntualidad: row.pts_puntualidad,
      cumplimiento: row.pts_cumplimiento,
      historial: row.pts_historial,
      antiguedad: row.pts_antiguedad,
    },
  };
}

async function queryTotalesCreditos(pool, clienteId, idTendero) {
  const result = await pool.query(`
    SELECT COALESCE(SUM(saldo_pendiente), 0) AS total_deuda,
           COUNT(*) AS total_creditos,
           COUNT(CASE WHEN estado = 'vencido' THEN 1 END) AS creditos_vencidos
    FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
  `, [clienteId, idTendero]);

  const row = result.rows[0];
  return {
    total_deuda: parseFloat(row.total_deuda) || 0,
    total_creditos: parseInt(row.total_creditos, 10) || 0,
    creditos_vencidos: parseInt(row.creditos_vencidos, 10) || 0,
  };
}

async function queryCreditosHistorico(pool, clienteId, idTendero) {
  const result = await pool.query(`
    SELECT COUNT(*) AS total_historico
    FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2
  `, [clienteId, idTendero]);

  return parseInt(result.rows[0].total_historico, 10) || 0;
}

module.exports = {
  calcularPuntaje,
  mapScoringRow,
  queryTotalesCreditos,
  queryCreditosHistorico,
};

const { mlPost } = require('./mlServiceClient');
const { calcularLimiteSugerido } = require('./scoringUtils');

async function callMLService(clienteId) {
  const postData = JSON.stringify({ id_cliente: parseInt(clienteId, 10) });
  const json = await mlPost('/predict', postData);
  if (json.error) throw new Error(json.error);
  return json;
}

async function persistMLPrediction(pool, clienteId, nivelRiesgo, confianza, limiteSugerido) {
  await pool.query(`
    UPDATE scoring
    SET nivel_riesgo = $1, confianza = $2, limite_sugerido = $3
    WHERE id_scoring = (
      SELECT id_scoring FROM scoring WHERE id_cliente = $4 ORDER BY fecha_calculo DESC LIMIT 1
    )
  `, [nivelRiesgo, confianza, limiteSugerido, clienteId]);
}

/**
 * Garantiza que nivel_riesgo, confianza y limite_sugerido provienen de la misma
 * predicción ML. Si confianza es null, invoca al microservicio, recalcula el
 * límite con el nivel_riesgo del RF (para no dejarlo desincronizado) y persiste
 * los tres campos juntos.
 *
 * Los clientes sin historial crediticio con el tendero tienen features en cero
 * (no hay nada real que predecir), así que se respeta la regla fija de negocio
 * (nivel_riesgo = 'medio') y nunca se le pide una predicción al RF.
 */
async function syncMLPrediction(pool, clienteId, scoringRow, idTendero, options = {}) {
  if (!scoringRow) return scoringRow;
  if (options.sinHistorialCrediticio) return scoringRow;
  if (scoringRow.confianza != null) return scoringRow;

  try {
    const rf = await callMLService(clienteId);
    const limiteSugerido = await calcularLimiteSugerido(pool, clienteId, idTendero, rf.nivel_riesgo);
    await persistMLPrediction(pool, clienteId, rf.nivel_riesgo, rf.confianza, limiteSugerido);
    return {
      ...scoringRow,
      nivel_riesgo: rf.nivel_riesgo,
      confianza: rf.confianza,
      limite_sugerido: limiteSugerido,
    };
  } catch (mlErr) {
    console.error('Error sincronizando predicción ML:', mlErr.message);
    return scoringRow;
  }
}

module.exports = {
  callMLService,
  persistMLPrediction,
  syncMLPrediction,
};

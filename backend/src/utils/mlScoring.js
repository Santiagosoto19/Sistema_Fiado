const { mlPost } = require('./mlServiceClient');

async function callMLService(clienteId) {
  const postData = JSON.stringify({ id_cliente: parseInt(clienteId, 10) });
  const json = await mlPost('/predict', postData);
  if (json.error) throw new Error(json.error);
  return json;
}

async function persistMLPrediction(pool, clienteId, nivelRiesgo, confianza) {
  await pool.query(`
    UPDATE scoring
    SET nivel_riesgo = $1, confianza = $2
    WHERE id_scoring = (
      SELECT id_scoring FROM scoring WHERE id_cliente = $3 ORDER BY fecha_calculo DESC LIMIT 1
    )
  `, [nivelRiesgo, confianza, clienteId]);
}

/**
 * Garantiza que nivel_riesgo y confianza provienen de la misma predicción ML.
 * Si confianza es null, invoca al microservicio y persiste ambos campos juntos.
 */
async function syncMLPrediction(pool, clienteId, scoringRow) {
  if (!scoringRow) return scoringRow;
  if (scoringRow.confianza != null) return scoringRow;

  try {
    const rf = await callMLService(clienteId);
    await persistMLPrediction(pool, clienteId, rf.nivel_riesgo, rf.confianza);
    return {
      ...scoringRow,
      nivel_riesgo: rf.nivel_riesgo,
      confianza: rf.confianza,
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

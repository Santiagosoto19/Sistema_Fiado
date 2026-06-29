const http = require('http');

function callMLService(clienteId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ id_cliente: parseInt(clienteId, 10) });
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/predict',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
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

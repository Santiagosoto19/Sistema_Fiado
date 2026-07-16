const { mlPost } = require('./mlServiceClient');

async function triggerMLRetrain(evento) {
  try {
    const postData = JSON.stringify({ evento });
    const json = await mlPost('/ml/retrain', postData, { timeoutMs: 5000 });
    console.log('[ML Retrain]', json.message || json);
    return json;
  } catch (err) {
    if (err.message === 'Timeout al contactar ML') {
      console.error('[ML Retrain]', err.message);
      return { status: 'timeout', message: err.message };
    }
    console.error('[ML Retrain] Error de conexión:', err.message);
    return { status: 'offline', message: 'Microservicio ML no disponible' };
  }
}

module.exports = { triggerMLRetrain };

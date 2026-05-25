const http = require('http');

function triggerMLRetrain(evento) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ evento });
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/ml/retrain',
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
          console.log('[ML Retrain]', json.message || json);
          resolve(json);
        } catch (e) {
          console.error('[ML Retrain] Respuesta no JSON:', data);
          resolve({ status: 'error', detail: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[ML Retrain] Error de conexión:', err.message);
      resolve({ status: 'offline', message: 'Microservicio ML no disponible' });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 'timeout', message: 'Timeout al contactar ML' });
    });

    req.write(postData);
    req.end();
  });
}

module.exports = { triggerMLRetrain };

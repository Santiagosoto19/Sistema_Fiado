const http = require('http');
const https = require('https');
const { URL } = require('url');

function getMlServiceBaseUrl() {
  return (process.env.ML_SERVICE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
}

function mlPost(path, postData, { timeoutMs } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path.replace(/^\//, ''), `${getMlServiceBaseUrl()}/`);
    const transport = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Respuesta ML no JSON: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);

    if (timeoutMs) {
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('Timeout al contactar ML'));
      });
    }

    req.write(postData);
    req.end();
  });
}

module.exports = { getMlServiceBaseUrl, mlPost };

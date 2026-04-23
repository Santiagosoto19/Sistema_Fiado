const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Webhook ejemplo (n8n)
app.post('/webhooks/test', (req, res) => {
  console.log('Webhook recibido:', req.body);
  res.json({ received: true });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
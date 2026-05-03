require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const carteraRoutes = require('./routes/cartera');
const clientesRoutes = require('./routes/clientes');
const creditosRoutes = require('./routes/creditos');
const abonosRoutes = require('./routes/abonos');
const alertasRoutes = require('./routes/alertas');
const analiticaRoutes = require('./routes/analitica');
const reportesRoutes = require('./routes/reportes');
const scoringRoutes = require('./routes/scoring');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cartera', carteraRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/creditos', creditosRoutes);
app.use('/api/abonos', abonosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/analitica', analiticaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/scoring', scoringRoutes);

// Webhook ejemplo (n8n)
app.post('/webhooks/test', (req, res) => {
  console.log('Webhook recibido:', req.body);
  res.json({ received: true });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`Servidor FiadoCheck corriendo en puerto ${PORT}`);
  console.log(`=================================`);
  console.log(`Endpoints disponibles:`);
  console.log(`  Auth: /api/auth/login, /api/auth/logout`);
  console.log(`  Dashboard: /api/dashboard`);
  console.log(`  Cartera: /api/cartera, /api/cartera/cliente/:id, /api/cartera/vencidos`);
  console.log(`  Clientes: /api/clientes, /api/clientes/:id, /api/clientes/:id/historial, /api/clientes/:id/pagos`);
  console.log(`  Créditos: /api/creditos, /api/creditos/:id, /api/creditos/cliente/:id, /api/creditos/:id/abonos`);
  console.log(`  Abonos: /api/abonos/:id`);
  console.log(`  Scoring: /api/scoring/:id, /api/scoring/:id/calcular, /api/scoring/:id/recomendacion`);
  console.log(`  Alertas: /api/alertas, /api/alertas/:id/leer`);
  console.log(`  Analítica: /api/analitica/indicadores, /api/analitica/pagos-diarios, /api/analitica/prediccion-flujo`);
  console.log(`  Reportes: /api/reportes, /api/reportes/export/pdf`);
  console.log(`=================================`);
});
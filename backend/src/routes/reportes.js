const express = require('express');
const authMiddleware = require('../middleware/auth');
const { validateQuery, rules } = require('../middlewares/validateBody');
const analyticsController = require('../modules/analiticas/analytics.controller');

const PERIODOS = ['semana', 'mes', 'trimestre', 'aldia'];
const validarPeriodoQuery = validateQuery([rules.oneOf('periodo', PERIODOS)]);

const router = express.Router();
router.use(authMiddleware);

// GET /api/reportes?periodo=semana|mes|trimestre|aldia
router.get('/', validarPeriodoQuery, analyticsController.getReporte);

// GET /api/reportes/export/pdf — devuelve HTML descargable (sin generación PDF)
router.get('/export/pdf', validarPeriodoQuery, analyticsController.exportarReporte);

module.exports = router;

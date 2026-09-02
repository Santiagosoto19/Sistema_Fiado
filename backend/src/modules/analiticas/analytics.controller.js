/**
 * analytics.controller.js
 * Capa HTTP — traduce req/res hacia/desde analyticsService.
 */

const pool = require('../../config/database');
const AppError = require('../../utils/AppError');
const analyticsService = require('./analytics.service');

const resolveIdTendero = async (user) => {
  if (user.id_tendero) return user.id_tendero;

  if (Number(user.id_rol) === 1 && user.id_usuario) {
    const result = await pool.query(
      'SELECT id_tendero FROM tenderos WHERE id_usuario = $1',
      [user.id_usuario]
    );
    return result.rows[0]?.id_tendero || null;
  }

  return null;
};

const getReporte = async (req, res) => {
  try {
    const idTendero = await resolveIdTendero(req.user);
    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a reportes' });
    }

    const data = await analyticsService.getReporte(
      idTendero,
      req.query.periodo
    );
    res.json(data);
  } catch (err) {
    if (err instanceof AppError)
      return res.status(err.statusCode).json({ error: err.message });
    console.error('Error en getReporte:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getIndicadores = async (req, res) => {
  try {
    const idTendero = await resolveIdTendero(req.user);
    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a analítica' });
    }

    const data = await analyticsService.getIndicadores(
      idTendero,
      req.query.periodo
    );
    res.json(data);
  } catch (err) {
    if (err instanceof AppError)
      return res.status(err.statusCode).json({ error: err.message });
    console.error('Error en getIndicadores:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getPagosDiarios = async (req, res) => {
  try {
    const idTendero = await resolveIdTendero(req.user);
    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a analítica' });
    }

    const data = await analyticsService.getPagosDiarios(idTendero);
    res.json(data);
  } catch (err) {
    console.error('Error en getPagosDiarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getPrediccionFlujo = async (req, res) => {
  try {
    const idTendero = await resolveIdTendero(req.user);
    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a analítica' });
    }

    const data = await analyticsService.getPrediccionFlujo(idTendero);
    res.json(data);
  } catch (err) {
    console.error('Error en getPrediccionFlujo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const exportarReporte = async (req, res) => {
  try {
    const idTendero = await resolveIdTendero(req.user);
    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para exportar reportes' });
    }

    const { html, fechaInicio, fechaFin } = await analyticsService.generarReporteHTML(
      idTendero,
      req.query.periodo
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-${fechaInicio}-${fechaFin}.html"`
    );
    res.send(html);
  } catch (err) {
    if (err instanceof AppError)
      return res.status(err.statusCode).json({ error: err.message });
    console.error('Error en exportarReporte:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getReporte,
  getIndicadores,
  getPagosDiarios,
  getPrediccionFlujo,
  exportarReporte,
};

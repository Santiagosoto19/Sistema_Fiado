/**
 * Capa HTTP del módulo de créditos. Traduce request/response de Express
 * hacia/desde la capa de servicio.
 */

const AppError = require('../../utils/AppError');
const creditsService = require('./credits.service');

const registrarAbono = async (req, res) => {
  const { creditoId } = req.params;
  const { monto, fechaAbono } = req.body;
  const idTendero = req.user.id_tendero;

  if (monto === undefined || monto === null || !fechaAbono) {
    return res.status(400).json({ error: 'monto y fechaAbono son requeridos' });
  }

  try {
    const resultado = await creditsService.registrarPago({
      creditoId,
      idTendero,
      monto,
      fechaAbono,
    });

    res.status(201).json({
      message: 'Abono registrado correctamente',
      ...resultado,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }

    console.error('Error al registrar abono:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  registrarAbono,
};

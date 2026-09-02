/**
 * Error de aplicación con código HTTP asociado.
 *
 * Permite que la capa de servicio lance errores de negocio (validaciones,
 * recursos no encontrados, conflictos de estado, etc.) sin acoplarse a
 * Express. El controller decide cómo responder según `statusCode`.
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

module.exports = AppError;

/**
 * validateBody.js
 *
 * Middleware reutilizable de validación para cualquier ruta.
 * Declara las reglas directamente en la definición de la ruta,
 * sin repetir código de validación en controllers ni services.
 *
 * Uso:
 *   const { validateBody, rules } = require('../middlewares/validateBody');
 *
 *   router.post('/', validateBody([
 *     rules.required('clienteId'),
 *     rules.positiveInt('clienteId'),
 *     rules.required('montoTotal'),
 *     rules.positiveNumber('montoTotal'),
 *     rules.required('fechaLimitePago'),
 *     rules.isoDate('fechaLimitePago'),
 *   ]), controller.crear);
 */

/**
 * Ejecuta una lista de funciones-regla sobre req.body.
 * Al primer error responde 400; si todo pasa, llama a next().
 *
 * @param {Function[]} reglas  Array de (body) => string|null
 */
const validateBody = (reglas) => (req, res, next) => {
  for (const regla of reglas) {
    const error = regla(req.body);
    if (error) return res.status(400).json({ error });
  }
  next();
};

/** Igual que validateBody pero sobre req.query. */
const validateQuery = (reglas) => (req, res, next) => {
  for (const regla of reglas) {
    const error = regla(req.query);
    if (error) return res.status(400).json({ error });
  }
  next();
};

/** Valida req.params (p. ej. IDs en la URL). */
const validateParams = (reglas) => (req, res, next) => {
  for (const regla of reglas) {
    const error = regla(req.params);
    if (error) return res.status(400).json({ error });
  }
  next();
};

// ── Reglas predefinidas ──────────────────────────────────────────────────────

/** El campo es obligatorio (no nulo, no vacío). */
const required = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null || val === '') {
    return `El campo '${campo}' es requerido`;
  }
  return null;
};

/** El campo debe ser texto con longitud mínima/máxima opcional. */
const string = (campo, opts = {}) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  if (typeof val !== 'string') return `El campo '${campo}' debe ser texto`;
  if (opts.min !== undefined && val.trim().length < opts.min)
    return `El campo '${campo}' debe tener al menos ${opts.min} caracteres`;
  if (opts.max !== undefined && val.trim().length > opts.max)
    return `El campo '${campo}' no puede superar ${opts.max} caracteres`;
  return null;
};

/** El campo debe ser un número mayor a 0. */
const positiveNumber = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (Number.isNaN(num)) return `El campo '${campo}' debe ser un número`;
  if (num <= 0) return `El campo '${campo}' debe ser mayor a 0`;
  return null;
};

/** El campo debe ser un número >= 0. */
const nonNegativeNumber = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (Number.isNaN(num)) return `El campo '${campo}' debe ser un número`;
  if (num < 0) return `El campo '${campo}' no puede ser negativo`;
  return null;
};

/** El campo debe ser un entero positivo (útil para IDs). */
const positiveInt = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0)
    return `El campo '${campo}' debe ser un número entero positivo`;
  return null;
};

/** El campo debe ser una fecha válida en formato YYYY-MM-DD. */
const isoDate = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  const patron = /^\d{4}-\d{2}-\d{2}$/;
  if (!patron.test(val) || Number.isNaN(new Date(val).getTime()))
    return `El campo '${campo}' debe ser una fecha válida (YYYY-MM-DD)`;
  return null;
};

/** El campo debe ser un teléfono válido (7-15 dígitos). */
const telefono = (campo) => (body) => {
  const val = body[campo];
  if (val === undefined || val === null) return null;
  const patron = /^\d{7,15}$/;
  if (!patron.test(String(val).replace(/\s/g, '')))
    return `El campo '${campo}' debe ser un teléfono válido (7-15 dígitos)`;
  return null;
};

/** El campo debe ser uno de los valores de la lista. */
const oneOf = (campo, opciones) => (data) => {
  const val = data[campo];
  if (val === undefined || val === null) return null;
  if (!opciones.includes(val))
    return `El campo '${campo}' debe ser uno de: ${opciones.join(', ')}`;
  return null;
};

/** Parámetro de ruta: entero positivo obligatorio. */
const paramPositiveInt = (campo) => (params) => {
  const val = params[campo];
  if (val === undefined || val === null || val === '') {
    return `El parámetro '${campo}' es requerido`;
  }
  const num = Number(val);
  if (!Number.isInteger(num) || num <= 0) {
    return `El parámetro '${campo}' debe ser un número entero positivo`;
  }
  return null;
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  rules: {
    required,
    string,
    positiveNumber,
    nonNegativeNumber,
    positiveInt,
    isoDate,
    telefono,
    oneOf,
    paramPositiveInt,
  },
};

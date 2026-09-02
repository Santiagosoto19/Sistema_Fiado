/**
 * Pruebas de validación sin base de datos.
 * Ejecutar: node scripts/test_validations.js
 */
require('dotenv').config();

const { validateBody, validateQuery, validateParams, rules } = require('../src/middlewares/validateBody');
const analyticsService = require('../src/modules/analiticas/analytics.service');
const AppError = require('../src/utils/AppError');

let passed = 0;
let failed = 0;

const assert = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
};

const runMiddleware = (middleware, req) => {
  let status;
  let payload;
  middleware(req, {
    status(code) {
      status = code;
      return this;
    },
    json(data) {
      payload = data;
      return this;
    },
  }, () => {
    status = 200;
  });
  return { status, payload };
};

console.log('\n=== validateBody (créditos) ===');
const crearCreditoRules = [
  rules.required('clienteId'),
  rules.positiveInt('clienteId'),
  rules.required('montoTotal'),
  rules.positiveNumber('montoTotal'),
  rules.required('fechaLimitePago'),
  rules.isoDate('fechaLimitePago'),
];
const mwBody = validateBody(crearCreditoRules);

assert('válido pasa', runMiddleware(mwBody, { body: { clienteId: 1, montoTotal: 100, fechaLimitePago: '2026-08-18' } }).status === 200);
assert('sin montoTotal → 400', runMiddleware(mwBody, { body: { clienteId: 1, fechaLimitePago: '2026-08-18' } }).status === 400);
assert('monto cero → 400', runMiddleware(mwBody, { body: { clienteId: 1, montoTotal: 0, fechaLimitePago: '2026-08-18' } }).status === 400);
assert('monto negativo → 400', runMiddleware(mwBody, { body: { clienteId: 1, montoTotal: -5, fechaLimitePago: '2026-08-18' } }).status === 400);
assert('fecha inválida → 400', runMiddleware(mwBody, { body: { clienteId: 1, montoTotal: 100, fechaLimitePago: '18-08-2026' } }).status === 400);
assert('clienteId string → 400', runMiddleware(mwBody, { body: { clienteId: 'abc', montoTotal: 100, fechaLimitePago: '2026-08-18' } }).status === 400);

console.log('\n=== validateQuery (reportes periodo) ===');
const mwQuery = validateQuery([rules.oneOf('periodo', ['semana', 'mes', 'trimestre', 'aldia'])]);
assert('periodo mes OK', runMiddleware(mwQuery, { query: { periodo: 'mes' } }).status === 200);
assert('sin periodo OK', runMiddleware(mwQuery, { query: {} }).status === 200);
assert('periodo inválido → 400', runMiddleware(mwQuery, { query: { periodo: 'anual' } }).status === 400);

console.log('\n=== validateParams (IDs) ===');
const mwParams = validateParams([rules.paramPositiveInt('id')]);
assert('id válido OK', runMiddleware(mwParams, { params: { id: '12' } }).status === 200);
assert('id abc → 400', runMiddleware(mwParams, { params: { id: 'abc' } }).status === 400);
assert('id -1 → 400', runMiddleware(mwParams, { params: { id: '-1' } }).status === 400);

console.log('\n=== analytics.service validarPeriodo ===');
(async () => {
  try {
    await analyticsService.getReporte(1, 'invalido');
    assert('periodo inválido rechazado', false);
  } catch (e) {
    assert('periodo inválido → AppError 400', e instanceof AppError && e.statusCode === 400);
  }

  console.log(`\n=== RESULTADO: ${passed} OK, ${failed} FAIL ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

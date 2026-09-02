/**
 * Verifica consistencia de pagos y actualización en BD.
 * Uso: node scripts/verify_registrar_pago.js
 */
require('dotenv').config();
const pool = require('../src/config/database');
const { registrarPago, validarConsistenciaPago } = require('../src/modules/creditos/credits.service');
const AppError = require('../src/utils/AppError');

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

async function runValidationTests() {
  const credito = {
    estado: 'vigente',
    saldo_pendiente: '50000',
    fecha_credito: '2026-01-01',
  };

  const tests = [
    { name: 'monto valido', fn: () => validarConsistenciaPago(credito, 25000, '2026-06-01') === 25000 },
    { name: 'rechaza monto 0', fn: () => { try { validarConsistenciaPago(credito, 0, '2026-06-01'); return false; } catch (e) { return e.statusCode === 400; } } },
    { name: 'rechaza monto > saldo', fn: () => { try { validarConsistenciaPago(credito, 50001, '2026-06-01'); return false; } catch (e) { return e.statusCode === 409; } } },
    { name: 'rechaza credito pagado', fn: () => { try { validarConsistenciaPago({ ...credito, estado: 'pagado' }, 100, '2026-06-01'); return false; } catch (e) { return e.statusCode === 409; } } },
    { name: 'rechaza fecha futura', fn: () => { try { validarConsistenciaPago(credito, 1000, '2099-01-01'); return false; } catch (e) { return e.statusCode === 400; } } },
    { name: 'rechaza 3 decimales', fn: () => { try { validarConsistenciaPago(credito, 100.001, '2026-06-01'); return false; } catch (e) { return e.statusCode === 400; } } },
    { name: 'acepta pago total', fn: () => validarConsistenciaPago(credito, 50000, '2026-06-01') === 50000 },
  ];

  let fail = 0;
  console.log('\n=== Validaciones de consistencia (unitarias) ===');
  for (const t of tests) {
    const pass = t.fn();
    console.log(`${pass ? 'PASS' : 'FAIL'} - ${t.name}`);
    if (!pass) fail++;
  }
  return fail;
}

async function runIntegrationTests() {
  const client = await pool.connect();
  let fail = 0;

  try {
    const { rows } = await client.query(`
      SELECT c.id_credito, c.id_tendero, c.id_cliente, c.saldo_pendiente, c.estado,
             COUNT(a.id_abono) AS num_abonos
      FROM creditos c
      LEFT JOIN abonos a ON a.id_credito = c.id_credito
      WHERE c.estado != 'pagado' AND c.saldo_pendiente > 1000
      GROUP BY c.id_credito
      LIMIT 1
    `);

    if (!rows.length) {
      console.log('\n=== Integracion BD ===');
      console.log('SKIP - No hay credito activo en BD');
      return 0;
    }

    const cr = rows[0];
    const saldoAntes = parseFloat(cr.saldo_pendiente);
    const abonosAntes = parseInt(cr.num_abonos, 10);
    const montoPago = Math.min(1000, saldoAntes / 2);
    const hoy = new Date().toISOString().slice(0, 10);

    console.log('\n=== Integracion BD ===');
    console.log(`Credito ${cr.id_credito} | saldo antes: ${saldoAntes} | abonos antes: ${abonosAntes}`);

    const resultado = await registrarPago({
      creditoId: cr.id_credito,
      idTendero: cr.id_tendero,
      monto: montoPago,
      fechaAbono: hoy,
    });

    const { rows: [actualizado] } = await client.query(
      'SELECT saldo_pendiente, estado FROM creditos WHERE id_credito = $1',
      [cr.id_credito]
    );
    const { rows: [{ count: abonosDespues }] } = await client.query(
      'SELECT COUNT(*)::int AS count FROM abonos WHERE id_credito = $1',
      [cr.id_credito]
    );

    const saldoEsperado = round2(Math.max(0, saldoAntes - montoPago));

    const checks = [
      ['respuesta incluye id_abono', !!resultado.id_abono],
      ['respuesta saldo_anterior correcto', resultado.saldo_anterior === round2(saldoAntes)],
      ['respuesta saldo_nuevo correcto', resultado.saldo_nuevo === saldoEsperado],
      ['BD: saldo_pendiente actualizado', round2(parseFloat(actualizado.saldo_pendiente)) === saldoEsperado],
      ['BD: fila en abonos insertada', abonosDespues === abonosAntes + 1],
      ['respuesta y BD coinciden', resultado.saldo_nuevo === round2(parseFloat(actualizado.saldo_pendiente))],
    ];

    for (const [name, pass] of checks) {
      console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
      if (!pass) fail++;
    }

    // Revertir abono de prueba
    await client.query('BEGIN');
    await client.query('DELETE FROM abonos WHERE id_abono = $1', [resultado.id_abono]);
    await client.query(
      'UPDATE creditos SET saldo_pendiente = $1, estado = $2 WHERE id_credito = $3',
      [saldoAntes, cr.estado, cr.id_credito]
    );
    await client.query('COMMIT');
    console.log('Limpieza: abono de prueba revertido');

    // Pago invalido no debe modificar BD
    let rechazoOk = false;
    try {
      await registrarPago({
        creditoId: cr.id_credito,
        idTendero: cr.id_tendero,
        monto: saldoAntes + 99999,
        fechaAbono: hoy,
      });
    } catch (e) {
      rechazoOk = e instanceof AppError && e.statusCode === 409;
    }

    const { rows: [{ count: abonosFinal }] } = await client.query(
      'SELECT COUNT(*)::int AS count FROM abonos WHERE id_credito = $1',
      [cr.id_credito]
    );
    const { rows: [creditoFinal] } = await client.query(
      'SELECT saldo_pendiente FROM creditos WHERE id_credito = $1',
      [cr.id_credito]
    );

    const rollbackChecks = [
      ['rechaza pago excesivo (409)', rechazoOk],
      ['ROLLBACK: sin abono extra', abonosFinal === abonosAntes],
      ['ROLLBACK: saldo intacto', round2(parseFloat(creditoFinal.saldo_pendiente)) === round2(saldoAntes)],
    ];

    for (const [name, pass] of rollbackChecks) {
      console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
      if (!pass) fail++;
    }
  } finally {
    client.release();
  }

  return fail;
}

(async () => {
  try {
    const fails = (await runValidationTests()) + (await runIntegrationTests());
    console.log(`\n--- Resultado: ${fails === 0 ? 'TODO OK' : fails + ' fallos'} ---`);
    process.exit(fails ? 1 : 0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

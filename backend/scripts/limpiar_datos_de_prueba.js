/**
 * Limpieza de los datos que dejan las colecciones de Postman.
 *
 * Sustituye a la limpieza que estaba documentada en las colecciones, que era
 * incompleta y ni siquiera podía ejecutarse:
 *
 *   DELETE FROM usuario WHERE email LIKE '%@test.fiadocheck.com';
 *
 * Las tres claves foráneas que apuntan a `usuario` (tenderos, clientes,
 * sesiones) son NO ACTION, así que ese DELETE aborta por violación de clave
 * foránea mientras existan filas dependientes. Hay que borrarlas antes y en
 * orden.
 *
 * QUÉ BORRA
 *   - Usuarios cuyo email termina en @test.fiadocheck.com, y todo lo que
 *     cuelga de ellos: sesiones, tenderos y clientes.
 *   - Clientes llamados "Cliente Scoring %", que crea la colección de
 *     SCRUM-110 en cada corrida, con su scoring y sus vínculos.
 *
 * QUÉ NO BORRA
 *   - El cliente 111759174. Se llama "Cliente Scoring" pero pertenece a
 *     tendero1@tiendasegura.com, una cuenta real, y es uno de los dos pares
 *     sin créditos citados en la evidencia de GC-05 (SCRUM-71). Borrarlo
 *     invalidaría esa evidencia.
 *   - Cualquier cliente con créditos. Si aparece alguno, el script aborta:
 *     significaría que algo dejó de ser dato de prueba.
 *
 * Uso:
 *   node scripts/limpiar_datos_de_prueba.js --dry-run
 *   node scripts/limpiar_datos_de_prueba.js
 */

require('dotenv').config();
const pool = require('../src/config/database');

const DRY_RUN = process.argv.includes('--dry-run');
const PRESERVAR = ['111759174'];

async function limpiar() {
  const client = await pool.connect();

  try {
    const usuarios = await client.query(
      "SELECT id_usuario FROM usuario WHERE email LIKE '%@test.fiadocheck.com'"
    );
    const uids = usuarios.rows.map((r) => r.id_usuario);

    const clientes = await client.query(`
      SELECT id_cliente FROM clientes
      WHERE (nombre_completo LIKE 'Cliente Scoring %' OR id_usuario = ANY($1))
        AND id_cliente <> ALL($2)
    `, [uids, PRESERVAR]);
    const cids = clientes.rows.map((r) => r.id_cliente);

    const tenderos = await client.query('SELECT id_tendero FROM tenderos WHERE id_usuario = ANY($1)', [uids]);
    const tids = tenderos.rows.map((r) => r.id_tendero);

    console.log(`  usuarios de prueba : ${uids.length}`);
    console.log(`  clientes de prueba : ${cids.length}`);
    console.log(`  tenderos de prueba : ${tids.length}`);
    console.log(`  preservados        : ${PRESERVAR.join(', ')}`);

    // Salvaguarda: nada con créditos se considera dato de prueba.
    const creditos = await client.query(
      'SELECT COUNT(*) n FROM creditos WHERE id_cliente = ANY($1) OR id_tendero = ANY($2)',
      [cids, tids]
    );
    if (Number(creditos.rows[0].n) > 0) {
      console.error(`  ABORTA: hay ${creditos.rows[0].n} créditos asociados. No son datos de prueba.`);
      process.exitCode = 1;
      return;
    }
    console.log('  créditos asociados : 0 (se puede borrar sin perder nada real)');

    if (DRY_RUN) {
      console.log('  --dry-run: no se borra nada.');
      return;
    }

    await client.query('BEGIN');

    const borrado = {};
    const del = async (etiqueta, sql, params) => {
      const r = await client.query(sql, params);
      borrado[etiqueta] = r.rowCount;
    };

    // Orden impuesto por las claves foráneas.
    await del('scoring', 'DELETE FROM scoring WHERE id_cliente = ANY($1) OR id_tendero = ANY($2)', [cids, tids]);
    await del('tendero_cliente', 'DELETE FROM tendero_cliente WHERE id_cliente = ANY($1) OR id_tendero = ANY($2)', [cids, tids]);
    await del('clientes', 'DELETE FROM clientes WHERE id_cliente = ANY($1)', [cids]);
    await del('sesiones', 'DELETE FROM sesiones WHERE id_usuario = ANY($1)', [uids]);
    await del('tenderos', 'DELETE FROM tenderos WHERE id_usuario = ANY($1)', [uids]);
    await del('usuario', 'DELETE FROM usuario WHERE id_usuario = ANY($1)', [uids]);

    await client.query('COMMIT');

    console.log('  filas borradas:');
    Object.entries(borrado).forEach(([t, n]) => console.log(`    ${t.padEnd(18)} ${n}`));
    console.log('  COMMIT aplicado');
  } catch (err) {
    if (!DRY_RUN) await client.query('ROLLBACK').catch(() => {});
    console.error(`  ERROR, se deshizo todo: ${err.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

limpiar();

/**
 * Migración: un cliente puede existir sin cuenta de usuario (BUG-013).
 *
 * POST /api/clientes deja al tendero dar de alta a un cliente exigiendo solo
 * nombre, identificación y teléfono, e inserta id_usuario = NULL porque esa
 * persona no tiene cuenta en la app. Pero la columna era NOT NULL, así que el
 * endpoint fallaba SIEMPRE con SQLSTATE 23502 y el backend lo devolvía como un
 * 500 genérico. Eso dejaba sin ejecutar SCO-02 y SCO-05b de SCRUM-110, que
 * necesitan un cliente recién creado.
 *
 * `direccion` tenía el mismo problema: el endpoint la trata como opcional
 * (`direccion?.trim() || null`) pero la columna tampoco admitía nulos.
 *
 * Se descartó la alternativa de crear un usuario mínimo desde el endpoint:
 * generar cuentas de relleno sin credenciales utilizables es exactamente lo que
 * produjo BUG-006, con 100 usuarios que no pueden iniciar sesión.
 *
 * Las filas existentes no se tocan: todas tienen id_usuario real. Los
 * consumidores consultan siempre `WHERE id_usuario = $1` con un valor concreto,
 * así que un NULL no casa con ninguna, que es justo lo que se espera de un
 * cliente sin cuenta.
 *
 * Uso:
 *   node scripts/migrate_cliente_sin_usuario.js --dry-run
 *   node scripts/migrate_cliente_sin_usuario.js
 */

require('dotenv').config();
const pool = require('../src/config/database');

const DRY_RUN = process.argv.includes('--dry-run');

const COLUMNAS = ['id_usuario', 'direccion'];

async function migrar() {
  const client = await pool.connect();

  try {
    const estado = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clientes' AND column_name = ANY($1)
      ORDER BY column_name
    `, [COLUMNAS]);

    console.log('  estado actual:');
    estado.rows.forEach((r) => console.log(`    ${r.column_name.padEnd(12)} NOT NULL: ${r.is_nullable === 'NO' ? 'si' : 'no'}`));

    const filas = await client.query('SELECT COUNT(*) total, COUNT(id_usuario) con_usuario FROM clientes');
    console.log(`  clientes: ${filas.rows[0].total} (con id_usuario: ${filas.rows[0].con_usuario})`);

    if (DRY_RUN) {
      console.log('  --dry-run: no se escribe nada.');
      return;
    }

    await client.query('BEGIN');
    await client.query('ALTER TABLE clientes ALTER COLUMN id_usuario DROP NOT NULL');
    await client.query('ALTER TABLE clientes ALTER COLUMN direccion  DROP NOT NULL');
    await client.query('COMMIT');

    const despues = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clientes' AND column_name = ANY($1)
      ORDER BY column_name
    `, [COLUMNAS]);

    console.log('  estado final:');
    despues.rows.forEach((r) => console.log(`    ${r.column_name.padEnd(12)} admite NULL: ${r.is_nullable === 'YES' ? 'si' : 'no'}`));

    const intactas = await pool.query('SELECT COUNT(*) total, COUNT(id_usuario) con_usuario FROM clientes');
    console.log(`  clientes tras migrar: ${intactas.rows[0].total} (con id_usuario: ${intactas.rows[0].con_usuario})`);
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

migrar();

/**
 * Migración: el scoring pasa de ser una fila por cliente a una fila por par
 * (cliente, tendero).
 *
 * Motivo (BUG-012). Los puntos se calculan con los créditos que otorgó UN
 * tendero (`creditos ... WHERE id_cliente = $1 AND id_tendero = $2`), pero la
 * tabla tenía `UNIQUE (id_cliente)`, así que el último tendero en recalcular
 * sobreescribía la fila y los demás pasaban a ver un puntaje derivado de
 * créditos que nunca concedieron.
 *
 * Las filas viejas no se pueden repartir entre tenderos: no guardan de quién
 * salieron, y 6 de las 58 pertenecen a clientes con dos tenderos. En vez de
 * adivinar, se borran y se regeneran todas con `calcularScoring`, la misma
 * función que usa el endpoint. Todo corre en una transacción.
 *
 * `confianza` queda en NULL a propósito: la predicción del Random Forest se
 * repone sola en la primera lectura de cada par, que es el comportamiento ya
 * previsto por `syncMLPrediction`.
 *
 * Uso:
 *   node scripts/migrate_scoring_por_tendero.js --dry-run   (no escribe)
 *   node scripts/migrate_scoring_por_tendero.js
 */

require('dotenv').config();
const pool = require('../src/config/database');
const { calcularScoring } = require('../src/utils/scoringCalculo');

const DRY_RUN = process.argv.includes('--dry-run');

const log = (msg) => console.log(msg);

async function migrar() {
  const client = await pool.connect();

  try {
    const antes = await client.query('SELECT COUNT(*) n FROM scoring');
    const pares = await client.query(`
      SELECT id_cliente, id_tendero
      FROM tendero_cliente
      WHERE estado = 'activo'
      ORDER BY id_cliente, id_tendero
    `);

    log(`  filas de scoring antes         : ${antes.rows[0].n}`);
    log(`  pares (cliente,tendero) activos: ${pares.rows.length}`);

    if (DRY_RUN) {
      log('  --dry-run: no se escribe nada. Calculando una muestra de 3 pares...');
      for (const { id_cliente, id_tendero } of pares.rows.slice(0, 3)) {
        const c = await calcularScoring(client, id_cliente, id_tendero);
        log(`    cliente ${id_cliente} / tendero ${id_tendero} -> ${c.ptsPuntualidad}+${c.ptsCumplimiento}+${c.ptsHistorial}+${c.ptsAntiguedad} = ${c.puntajeTotal} (${c.nivelRiesgo})`);
      }
      return;
    }

    await client.query('BEGIN');

    // 1. Columna nueva
    await client.query('ALTER TABLE scoring ADD COLUMN IF NOT EXISTS id_tendero VARCHAR');
    log('  [1/6] columna id_tendero añadida');

    // 2. Fuera la restricción que impedía más de una fila por cliente
    await client.query('ALTER TABLE scoring DROP CONSTRAINT IF EXISTS scoring_id_cliente_key');
    log('  [2/6] restricción UNIQUE (id_cliente) eliminada');

    // 3. Las filas viejas no son atribuibles a un tendero: se regeneran todas
    const borradas = await client.query('DELETE FROM scoring');
    log(`  [3/6] ${borradas.rowCount} filas antiguas eliminadas para recalcularlas`);

    // 4. Clave única del nuevo modelo, necesaria para el ON CONFLICT del upsert
    await client.query(`
      ALTER TABLE scoring
      ADD CONSTRAINT scoring_cliente_tendero_key UNIQUE (id_cliente, id_tendero)
    `);
    log('  [4/6] restricción UNIQUE (id_cliente, id_tendero) creada');

    // 5. Recalcular cada par con la lógica real del endpoint
    let insertadas = 0;
    let nuevos = 0;
    for (const { id_cliente, id_tendero } of pares.rows) {
      const c = await calcularScoring(client, id_cliente, id_tendero);
      if (!c) continue;
      if (c.clienteNuevo) nuevos++;

      await client.query(`
        INSERT INTO scoring (id_cliente, id_tendero, nivel_riesgo, pts_puntualidad, pts_historial,
                             pts_cumplimiento, pts_antiguedad, limite_sugerido, confianza)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
      `, [id_cliente, id_tendero, c.nivelRiesgo, c.ptsPuntualidad, c.ptsHistorial,
          c.ptsCumplimiento, c.ptsAntiguedad, c.limiteSugerido]);
      insertadas++;
    }
    log(`  [5/6] ${insertadas} filas recalculadas (${nuevos} sin créditos con su tendero)`);

    // 6. Integridad: la columna deja de admitir nulos y apunta a tenderos
    await client.query('ALTER TABLE scoring ALTER COLUMN id_tendero SET NOT NULL');
    await client.query(`
      ALTER TABLE scoring
      ADD CONSTRAINT scoring_id_tendero_fkey
      FOREIGN KEY (id_tendero) REFERENCES tenderos(id_tendero)
    `);
    log('  [6/6] id_tendero marcada NOT NULL y con clave foránea a tenderos');

    await client.query('COMMIT');
    log('  COMMIT aplicado');
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

/**
 * Repuebla la predicción del Random Forest en todas las filas de `scoring`.
 *
 * Tras migrar el scoring a par (cliente, tendero) las filas se regeneraron con
 * `confianza` en NULL, porque la predicción se repone de forma perezosa en la
 * primera lectura de cada par. Eso deja GC-06 sin datos que medir: no se puede
 * comparar el nivel del RF con el umbral por reglas si casi nadie tiene nivel
 * del RF todavía.
 *
 * Hace lo mismo que syncMLPrediction, y por los mismos motivos:
 *   1. pide la predicción al microservicio con (id_cliente, id_tendero);
 *   2. recalcula el límite con el nivel del RF, no con el de reglas, para que
 *      nivel_riesgo y limite_sugerido no queden desincronizados;
 *   3. persiste los tres campos juntos.
 *
 * Los pares sin créditos se saltan a propósito: la regla de negocio fija su
 * nivel en 'medio' con confianza NULL y nunca se le pide predicción al RF,
 * porque no hay features reales que evaluar (ver SCO-02).
 *
 * Uso:
 *   node scripts/repoblar_predicciones_ml.js --dry-run
 *   node scripts/repoblar_predicciones_ml.js
 *   node scripts/repoblar_predicciones_ml.js --url https://otro-ml.example.com
 */

require('dotenv').config();
const pool = require('../src/config/database');
const { calcularLimiteSugerido } = require('../src/utils/scoringUtils');

const DRY_RUN = process.argv.includes('--dry-run');
const urlArgIndex = process.argv.indexOf('--url');
const ML_URL = (urlArgIndex !== -1 && process.argv[urlArgIndex + 1])
  || process.env.ML_SERVICE_URL
  || 'https://fiadocheck-ml.azurewebsites.net';

const TIMEOUT_MS = 120000;

const predecir = async (idCliente, idTendero) => {
  const res = await fetch(`${ML_URL.replace(/\/+$/, '')}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_cliente: parseInt(idCliente, 10), id_tendero: parseInt(idTendero, 10) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
};

async function repoblar() {
  console.log(`  microservicio: ${ML_URL}`);

  try {
    // Cada fila con el número de créditos que ese tendero le otorgó al cliente.
    const filas = await pool.query(`
      SELECT s.id_cliente, s.id_tendero, s.confianza,
             (SELECT COUNT(*) FROM creditos cr
              WHERE cr.id_cliente = s.id_cliente AND cr.id_tendero = s.id_tendero) AS creditos
      FROM scoring s
      ORDER BY s.id_cliente, s.id_tendero
    `);

    const conHistorial = filas.rows.filter((f) => Number(f.creditos) > 0);
    const sinHistorial = filas.rows.length - conHistorial.length;

    console.log(`  filas totales: ${filas.rows.length}`);
    console.log(`  con historial (se les pide predicción): ${conHistorial.length}`);
    console.log(`  sin historial (regla fija, se omiten)  : ${sinHistorial}`);

    if (DRY_RUN) {
      console.log('  --dry-run: no se escribe nada.');
      return;
    }

    // Una petición inicial para absorber el arranque en frío del App Service.
    try {
      await fetch(`${ML_URL.replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch { /* si falla, el primer predict reintenta igualmente */ }

    let ok = 0;
    const fallos = [];

    for (const fila of conHistorial) {
      const { id_cliente: cli, id_tendero: ten } = fila;
      try {
        const rf = await predecir(cli, ten);
        const limite = await calcularLimiteSugerido(pool, cli, ten, rf.nivel_riesgo);
        await pool.query(`
          UPDATE scoring
          SET nivel_riesgo = $1, confianza = $2, limite_sugerido = $3
          WHERE id_cliente = $4 AND id_tendero = $5
        `, [rf.nivel_riesgo, rf.confianza, limite, cli, ten]);
        ok++;
      } catch (err) {
        fallos.push(`cliente ${cli} / tendero ${ten}: ${err.message}`);
      }
    }

    console.log(`  actualizadas: ${ok} | fallidas: ${fallos.length}`);
    fallos.forEach((f) => console.log(`    fallo -> ${f}`));
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

repoblar();

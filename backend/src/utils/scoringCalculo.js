/**
 * Cálculo del scoring por reglas para un par (cliente, tendero).
 *
 * Estaba embebido en el handler de POST /api/scoring/:clienteId/calcular. Se
 * extrajo para que el backfill de la migración a scoring por tienda pudiera
 * generar las filas con esta misma lógica, en vez de reimplementar las cuatro
 * variables en un script aparte y arriesgar que divergieran.
 *
 * El scoring siempre se calcula con los créditos que ESE tendero otorgó: dos
 * tenderos que comparten cliente tienen historiales distintos y por tanto
 * puntajes distintos.
 */

const { calcularLimiteSugerido } = require('./scoringUtils');

// Cliente sin créditos con este tendero: no hay features reales que evaluar,
// así que aplica una regla de negocio fija y no se consulta al Random Forest.
const CLIENTE_NUEVO = {
  ptsPuntualidad: 0,
  ptsCumplimiento: 0,
  ptsHistorial: 0,
  ptsAntiguedad: 0,
  puntajeTotal: 50, // puntaje conceptual, no es la suma de las variables
  nivelRiesgo: 'medio',
  limiteSugerido: 50000,
};

const calcularPuntosAntiguedad = (createdAt) => {
  const fechaRegistro = new Date(createdAt);
  const mesesActivo = (new Date() - fechaRegistro) / (1000 * 60 * 60 * 24 * 30);

  if (mesesActivo >= 24) return 25;
  if (mesesActivo >= 12) return 20;
  if (mesesActivo >= 6) return 15;
  if (mesesActivo >= 3) return 10;
  if (mesesActivo >= 1) return 5;
  return 0;
};

const ultimoAbonoDe = (abonos) =>
  abonos.reduce((max, a) => (new Date(a.fecha_abono) > new Date(max.fecha_abono) ? a : max));

/**
 * @returns {Promise<object|null>} null si el cliente no existe. Si no, las cuatro
 * variables, el puntaje, el nivel por reglas y el límite sugerido.
 */
async function calcularScoring(pool, clienteId, idTendero) {
  const clienteRow = await pool.query('SELECT * FROM clientes WHERE id_cliente = $1', [clienteId]);
  if (clienteRow.rows.length === 0) return null;

  const creditos = await pool.query(
    'SELECT * FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 ORDER BY fecha_credito ASC',
    [clienteId, idTendero]
  );

  if (creditos.rows.length === 0) {
    return { ...CLIENTE_NUEVO, clienteNuevo: true };
  }

  // Los abonos se traen todos y se agrupan por crédito. Los de créditos de otros
  // tenderos quedan huérfanos en el mapa y nunca se leen, porque solo se consulta
  // con los id_credito ya filtrados.
  const abonos = await pool.query(
    'SELECT * FROM abonos WHERE id_cliente = $1 ORDER BY fecha_abono ASC',
    [clienteId]
  );

  const abonosPorCredito = {};
  abonos.rows.forEach((a) => {
    if (!abonosPorCredito[a.id_credito]) abonosPorCredito[a.id_credito] = [];
    abonosPorCredito[a.id_credito].push(a);
  });

  const creditosPagados = creditos.rows.filter((c) => c.estado === 'pagado');
  const creditosVencidos = creditos.rows.filter((c) => c.estado === 'vencido');
  const creditosCerrados = [...creditosPagados, ...creditosVencidos];

  // ── 1. PUNTUALIDAD (0-25 pts) ──
  let ptsPuntualidad = 0;
  if (creditosCerrados.length > 0) {
    let pagosATiempo = 0;
    creditosCerrados.forEach((c) => {
      if (c.estado === 'vencido') return;
      const abs = abonosPorCredito[c.id_credito];
      if (abs && abs.length > 0) {
        if (new Date(ultimoAbonoDe(abs).fecha_abono) <= new Date(c.fecha_limite_pago)) pagosATiempo++;
      }
    });
    const ratio = pagosATiempo / creditosCerrados.length;
    if (ratio >= 0.80) ptsPuntualidad = 25;
    else if (ratio >= 0.60) ptsPuntualidad = 20;
    else if (ratio >= 0.40) ptsPuntualidad = 15;
    else if (ratio > 0) ptsPuntualidad = 10;
  }

  // ── 2. CUMPLIMIENTO (0-25 pts) ──
  let ptsCumplimiento = 0;
  if (creditosCerrados.length > 0) {
    let diasAtrasoTotal = 0;
    creditosCerrados.forEach((c) => {
      if (c.estado === 'vencido') {
        diasAtrasoTotal += 31; // un vencido cuenta como atraso mayor a 30 días
        return;
      }
      const abs = abonosPorCredito[c.id_credito];
      if (abs && abs.length > 0) {
        const diffMs = new Date(ultimoAbonoDe(abs).fecha_abono) - new Date(c.fecha_limite_pago);
        diasAtrasoTotal += diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
      }
    });
    const promedioAtraso = Math.round(diasAtrasoTotal / creditosCerrados.length);

    if (promedioAtraso === 0) ptsCumplimiento = 25;
    else if (promedioAtraso <= 7) ptsCumplimiento = 20;
    else if (promedioAtraso <= 15) ptsCumplimiento = 15;
    else if (promedioAtraso <= 30) ptsCumplimiento = 10;
  }

  // ── 3. HISTORIAL (0-25 pts) ──
  let ptsHistorial = 0;
  if (creditosCerrados.length > 0) {
    const ratio = creditosPagados.length / creditosCerrados.length;
    if (ratio >= 0.90) ptsHistorial = 25;
    else if (ratio >= 0.70) ptsHistorial = 20;
    else if (ratio >= 0.50) ptsHistorial = 15;
    else ptsHistorial = 10;
  }

  // ── 4. ANTIGÜEDAD (0-25 pts) ──
  const ptsAntiguedad = calcularPuntosAntiguedad(clienteRow.rows[0].created_at);

  const puntajeTotal = ptsPuntualidad + ptsCumplimiento + ptsHistorial + ptsAntiguedad;

  let nivelRiesgo;
  if (puntajeTotal >= 80) nivelRiesgo = 'bajo';
  else if (puntajeTotal >= 50) nivelRiesgo = 'medio';
  else nivelRiesgo = 'alto';

  const limiteSugerido = await calcularLimiteSugerido(pool, clienteId, idTendero, nivelRiesgo);

  return {
    clienteNuevo: false,
    ptsPuntualidad,
    ptsCumplimiento,
    ptsHistorial,
    ptsAntiguedad,
    puntajeTotal,
    nivelRiesgo,
    limiteSugerido,
  };
}

module.exports = { calcularScoring };

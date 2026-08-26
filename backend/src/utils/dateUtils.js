/**
 * Utilidades de fecha sin ambigüedad de zona horaria.
 * Compara y normaliza a YYYY-MM-DD (calendario).
 */

// El calendario que importa es el del negocio (Colombia), no el del servidor.
// El proceso de desarrollo corre en UTC-5 y Azure App Service en UTC, así que
// "hoy" cambiaba según dónde estuviera desplegado: entre las 19:00 y las 23:59
// de Bogotá un servidor en UTC ya está en el día siguiente. Eso hacía que el
// mismo abono se aceptara en un entorno y se rechazara en el otro.
const ZONA_NEGOCIO = process.env.TZ_NEGOCIO || 'America/Bogota';

// 'en-CA' formatea como YYYY-MM-DD, que es justo la clave que se compara.
const crearFormateador = (zona) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

let formateador;
try {
  formateador = crearFormateador(ZONA_NEGOCIO);
} catch {
  // Una zona mal escrita en TZ_NEGOCIO lanza RangeError y tumbaría el arranque.
  console.warn(`[dateUtils] TZ_NEGOCIO inválida ("${ZONA_NEGOCIO}"), se usa America/Bogota.`);
  formateador = crearFormateador('America/Bogota');
}

const toDateKey = (value) => {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  // Una columna DATE de PostgreSQL no guarda hora ni zona; node-postgres la
  // entrega como medianoche LOCAL del proceso (p. ej. 00:00:00 GMT-0500), no
  // como medianoche UTC. Leerla con getUTC* solo acierta mientras el servidor
  // esté en UTC o al oeste; al este del meridiano devolvería el día anterior.
  // Con los componentes locales se recupera el día almacenado en cualquier zona.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Día de hoy en la zona del negocio, independiente de dónde corra el proceso.
const todayBusinessKey = () => formateador.format(new Date());

module.exports = { toDateKey, todayBusinessKey };

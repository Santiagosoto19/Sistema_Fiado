/**
 * Genera nota Markdown detallada en Obsidian a partir del JSON exportado por Newman.
 * Uso: node generate-obsidian-report.js [ruta-newman.json]
 */

const fs = require('fs');
const path = require('path');

const JSON_REPORT = process.argv[2]
  || path.join(__dirname, 'reports', 'newman-results.json');

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT
  || path.join(
    process.env.USERPROFILE || '',
    'OneDrive',
    'Documentos',
    'Obsidian Vault',
    'Sistema_Fiado',
    '02 - Desarrollo',
  );

const today = new Date();
const dateStr = today.toISOString().slice(0, 10);
const timeStr = today.toLocaleTimeString('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const OUTPUT_FILE = path.join(
  OBSIDIAN_VAULT,
  `Resultados Postman SV — ${dateStr}.md`,
);

/** Metadatos por caso de prueba (plan SV). */
const CASE_CATALOG = {
  Setup: {
    ticket: 'Setup',
    objetivo: 'Autenticar roles y preparar variables para la corrida.',
    esperado: 'HTTP 200 y tokens JWT válidos.',
  },
  'ALE-01': {
    ticket: 'SCRUM-53',
    objetivo: 'Listar alertas del tendero y filtrar por tipo crítica.',
    esperado: 'HTTP 200, array de alertas con tipos válidos (critica, proxima, informativa, pago_proximo, pago_vencido).',
  },
  'ALE-02': {
    ticket: 'SCRUM-53',
    objetivo: 'Marcar una alerta como leída.',
    esperado: 'HTTP 200 y mensaje de confirmación.',
  },
  'ALE-04': {
    ticket: 'SCRUM-53',
    objetivo: 'Control de acceso: cliente no ve alertas de tendero; tendero B no puede leer alerta ajena.',
    esperado: 'Cliente → 200 con array vacío o 403. Alerta ajena → 404.',
  },
  'ASIS-01': {
    ticket: 'SCRUM-114',
    objetivo: 'Validación de entrada en proxy del asistente.',
    esperado: 'HTTP 400 si falta el campo message.',
  },
  'ASIS-03': {
    ticket: 'SCRUM-114',
    objetivo: 'Proxy POST /asistente/chat reenvía al webhook n8n.',
    esperado: 'HTTP 200 con respuesta del asistente. Si n8n caído: 502/503/504/404 (proxy OK, infra pendiente).',
  },
  'ASIS-15': {
    ticket: 'SCRUM-54',
    objetivo: 'Aislamiento de cartera entre tenderos vía asistente.',
    esperado: 'HTTP 200 con datos distintos por tendero. Si n8n caído: 502/503/504/404.',
  },
  'ASIS-16': {
    ticket: 'SCRUM-54',
    objetivo: 'Rol cliente bloqueado en asistente de tendero.',
    esperado: 'HTTP 403 Forbidden.',
  },
  'GC-17': {
    ticket: 'SCRUM-118',
    objetivo: 'Cartera vencida para gestión de cobro.',
    esperado: 'HTTP 200 con estructura de datos de vencidos.',
  },
  'ANA-04': {
    ticket: 'SCRUM-118',
    objetivo: 'Analítica agregada por cliente (KPIs + pagos semanales).',
    esperado: 'HTTP 200 con recuperado, pendiente, pagos_semanales[].',
  },
  'SCRUM-117': {
    ticket: 'SCRUM-117',
    objetivo: 'Smoke: API viva y dashboard tendero responde.',
    esperado: 'GET /health → 200 status ok. GET /dashboard → 200 con cartera_total.',
  },
  'SCRUM-118': {
    ticket: 'SCRUM-118',
    objetivo: 'Clientes en mora para apoyo mobile/GC.',
    esperado: 'HTTP 200.',
  },
  Apoyo: {
    ticket: 'Apoyo Mobile',
    objetivo: 'Endpoints que consume la app móvil (comparar vs UI).',
    esperado: 'HTTP 200 con contrato JSON válido.',
  },
};

const TICKET_ORDER = [
  'Setup',
  'SCRUM-117',
  'SCRUM-53',
  'SCRUM-114',
  'SCRUM-54',
  'SCRUM-118',
  'Apoyo Mobile',
];

const TICKET_MAP = [
  { prefix: 'SCRUM-117', ticket: 'SCRUM-117' },
  { prefix: 'ALE-', ticket: 'SCRUM-53' },
  { prefix: 'ASIS-01', ticket: 'SCRUM-114' },
  { prefix: 'ASIS-03', ticket: 'SCRUM-114' },
  { prefix: 'ASIS-16', ticket: 'SCRUM-54' },
  { prefix: 'ASIS-15', ticket: 'SCRUM-54' },
  { prefix: 'GC-17', ticket: 'SCRUM-118' },
  { prefix: 'ANA-04', ticket: 'SCRUM-118' },
  { prefix: 'Login', ticket: 'Setup' },
  { prefix: 'GET Clientes (tendero)', ticket: 'Setup' },
  { prefix: 'GET /health', ticket: 'SCRUM-117' },
  { prefix: 'GET /api/dashboard', ticket: 'SCRUM-117' },
  { prefix: 'GET /dashboard', ticket: 'SCRUM-117' },
  { prefix: 'GET /clientes?estado=mora', ticket: 'SCRUM-118' },
  { prefix: 'GET /clientes', ticket: 'Apoyo Mobile' },
  { prefix: 'GET /scoring', ticket: 'Apoyo Mobile' },
  { prefix: 'scoring', ticket: 'Apoyo Mobile' },
];

function loadReport() {
  if (!fs.existsSync(JSON_REPORT)) {
    console.error(`No se encontró el reporte JSON: ${JSON_REPORT}`);
    console.error('Ejecuta primero: .\\run-postman-docs.ps1');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(JSON_REPORT, 'utf8'));
}

function getExecutions(report) {
  const run = report.run || report;
  return run.executions || [];
}

function inferTicket(name) {
  const hit = TICKET_MAP.find((m) => name.includes(m.prefix));
  return hit?.ticket || 'General';
}

function extractCaseIds(name, assertions) {
  const ids = new Set();
  const bracketRe = /\[(Setup|ALE-\d+|ASIS-\d+|GC-17|ANA-04|SCRUM-\d+|Apoyo)\]/g;
  const plainRe = /\b(ALE-\d+|ASIS-\d+|GC-17|ANA-04)\b/g;
  let m;

  while ((m = bracketRe.exec(name)) !== null) ids.add(m[1]);
  while ((m = plainRe.exec(name)) !== null) ids.add(m[1]);

  (assertions || []).forEach((a) => {
    const text = a.assertion || '';
    while ((m = bracketRe.exec(text)) !== null) ids.add(m[1]);
    while ((m = plainRe.exec(text)) !== null) ids.add(m[1]);
  });

  if (ids.size === 0) {
    if (name.includes('health') || name.includes('dashboard')) ids.add('SCRUM-117');
    else if (name.startsWith('GET /clientes') || name.includes('/scoring')) ids.add('Apoyo');
    else ids.add('Setup');
  }
  return [...ids];
}

function formatUrl(req) {
  if (!req?.url) return '—';
  if (typeof req.url === 'string') return req.url;
  const u = req.url;
  if (u.raw) return u.raw.replace(/\{\{base_url\}\}/g, 'https://fiadocheck-api.azurewebsites.net/api');
  const protocol = u.protocol || 'https';
  const host = Array.isArray(u.host) ? u.host.join('.') : (u.host || '');
  const pathPart = Array.isArray(u.path) ? u.path.join('/') : (u.path || '');
  return host ? `${protocol}://${host}/${pathPart}` : pathPart;
}

function decodeBody(response) {
  if (!response?.stream?.data) return null;
  try {
    const text = Buffer.from(response.stream.data).toString('utf8');
    try {
      return JSON.parse(text);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return null;
  }
}

function summarizeBody(name, code, body) {
  if (body == null) return '—';
  if (typeof body === 'string') return body.slice(0, 120);

  const parts = [];

  if (body.status === 'ok') parts.push('status: ok');
  if (body.token) parts.push('token: ✓');
  if (body.message) parts.push(`message: "${String(body.message).slice(0, 60)}"`);
  if (body.error) parts.push(`error: "${String(body.error).slice(0, 80)}"`);
  if (body.cartera_total != null) parts.push(`cartera_total: ${body.cartera_total}`);
  if (Array.isArray(body)) parts.push(`${body.length} elemento(s)`);
  if (body.vencidos && Array.isArray(body.vencidos)) parts.push(`vencidos: ${body.vencidos.length}`);
  if (body.recuperado != null) parts.push(`recuperado: ${body.recuperado}`);
  if (body.pendiente != null) parts.push(`pendiente: ${body.pendiente}`);
  if (Array.isArray(body.pagos_semanales)) parts.push(`pagos_semanales: ${body.pagos_semanales.length} semanas`);
  if (body.respuesta) parts.push(`respuesta: "${String(body.respuesta).slice(0, 60)}…"`);
  if (body.mensaje && !body.message) parts.push(`mensaje: "${String(body.mensaje).slice(0, 60)}"`);
  if (body.estado) parts.push(`estado: ${body.estado}`);
  if (body.nivel) parts.push(`nivel: ${body.nivel}`);

  if (Array.isArray(body) && body.length && body[0]?.tipo) {
    parts.push(`tipos: ${[...new Set(body.map((x) => x.tipo))].join(', ')}`);
  }
  if (Array.isArray(body) && body.length && body[0]?.id_alerta) {
    parts.push(`alertas: ${body.length}, primera id=${body[0].id_alerta}`);
  }

  if (!parts.length) {
    const keys = Object.keys(body).slice(0, 5);
    parts.push(`keys: ${keys.join(', ')}`);
  }

  return parts.join(' · ');
}

function isExpectedErrorStatus(name, caseIds, code) {
  if (caseIds.includes('ASIS-01') && code === 400) return true;
  if (caseIds.includes('ASIS-16') && code === 403) return true;
  if (caseIds.includes('ALE-04') && code === 404 && name.includes('404')) return true;
  if (caseIds.includes('ALE-04') && code === 403) return true;
  return false;
}

function isInfraDegraded(name, caseIds, code) {
  const asis = caseIds.some((id) => id.startsWith('ASIS-')) || /\bASIS-\d+\b/.test(name);
  if (!asis) return false;
  if ([502, 503, 504, 404].includes(code)) return true;
  return false;
}

function classifyExecution(ex) {
  const name = ex.item?.name || 'Sin nombre';
  const code = ex.response?.code ?? null;
  const assertions = ex.assertions || [];
  const caseIds = extractCaseIds(name, assertions);
  const failedAssertions = assertions.filter((a) => a.error);
  const allPassed = failedAssertions.length === 0 && !ex.requestError;

  let icon;
  let verdict;
  let nota;

  if (ex.requestError || failedAssertions.length) {
    icon = '❌';
    verdict = 'FALLÓ';
    nota = ex.requestError?.message
      || failedAssertions.map((a) => a.error.message).join('; ');
  } else if (isInfraDegraded(name, caseIds, code)) {
    icon = '⚠️';
    verdict = 'OK (infra)';
    nota = `Proxy responde pero n8n/webhook devolvió ${code}. Revisar configuración Azure/n8n.`;
  } else if (isExpectedErrorStatus(name, caseIds, code)) {
    icon = '✅';
    verdict = 'OK (esperado)';
    nota = `HTTP ${code} es el comportamiento esperado para este caso de seguridad/validación.`;
  } else if (code >= 400) {
    icon = '❌';
    verdict = 'FALLÓ';
    nota = `HTTP ${code} inesperado — revisar API.`;
  } else {
    icon = '✅';
    verdict = 'OK';
    nota = 'Todas las assertions pasaron.';
  }

  return {
    name,
    ticket: inferTicket(name),
    caseIds,
    icon,
    verdict,
    nota,
    code: code ?? '—',
    responseTime: ex.response?.responseTime ?? '—',
    method: ex.request?.method || ex.item?.request?.method || '—',
    url: formatUrl(ex.request || ex.item?.request),
    assertions,
    body: decodeBody(ex.response),
    allPassed,
  };
}

function primaryCaseId(caseIds) {
  const priority = ['ALE-01', 'ALE-02', 'ALE-04', 'ASIS-01', 'ASIS-03', 'ASIS-15', 'ASIS-16', 'GC-17', 'ANA-04', 'SCRUM-117', 'SCRUM-118', 'Setup', 'Apoyo'];
  return priority.find((id) => caseIds.includes(id)) || caseIds[0];
}

function buildMarkdown(report) {
  const executions = getExecutions(report);
  const stats = report.run?.stats || {};
  const total = stats.assertions?.total ?? 0;
  const failed = stats.assertions?.failed ?? 0;
  const passed = total - failed;

  const rows = executions.map(classifyExecution);

  const okCount = rows.filter((r) => r.icon === '✅').length;
  const infraCount = rows.filter((r) => r.icon === '⚠️').length;
  const failCount = rows.filter((r) => r.icon === '❌').length;

  const byTicket = rows.reduce((acc, row) => {
    if (!acc[row.ticket]) acc[row.ticket] = [];
    acc[row.ticket].push(row);
    return acc;
  }, {});

  let md = `---
tags:
  - fiadocheck/pruebas
  - sv/soto
  - postman
  - resultados
fecha: ${dateStr}
generado: automatico
ultima_ejecucion: "${dateStr} ${timeStr}"
---

# Resultados Postman SV — ${dateStr}

> **Generado:** ${dateStr} ${timeStr} (Newman automático)  
> **Responsable:** Santiago (SV)  
> **Entorno:** Azure (\`fiadocheck-api.azurewebsites.net\`)  
> **Reporte HTML:** [[Adjuntos/postman-report-${dateStr}.html]]  
> **Plan:** [[plan_de_pruebas_fiadocheck]] · **Guía:** [[Guia Postman SV — Pruebas y Documentacion]]

> [!tip] Si ves datos viejos
> Cierra y vuelve a abrir esta nota, o pulsa **Ctrl+R** en Obsidian. El archivo se sobrescribe en cada corrida.

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Requests ejecutados | ${executions.length} |
| Assertions pasadas | ${passed} / ${total} |
| Assertions fallidas | ${failed} |
| ✅ OK | ${okCount} requests |
| ⚠️ OK con observación (n8n/infra) | ${infraCount} requests |
| ❌ Fallidos | ${failCount} requests |
| **Resultado global** | ${failed === 0 ? '**✅ Colección OK**' : '**❌ Revisar fallos**'} |

### Leyenda

| Icono | Significado |
|-------|-------------|
| ✅ | Todas las assertions pasaron (incluye 400/403/404 **esperados**) |
| ⚠️ | Assertions OK, pero n8n/webhook no respondió — revisar infra |
| ❌ | Assertion fallida o status inesperado |

`;

  TICKET_ORDER.concat(Object.keys(byTicket).filter((t) => !TICKET_ORDER.includes(t)))
    .filter((t, i, arr) => arr.indexOf(t) === i && byTicket[t])
    .forEach((ticket) => {
      const items = byTicket[ticket];
      md += `\n---\n\n## ${ticket} — resumen\n\n`;
      md += '| Resultado | Caso | Request | HTTP | Tiempo | Veredicto |\n';
      md += '|-----------|------|---------|------|--------|----------|\n';
      items.forEach((r) => {
        const caso = r.caseIds.join(', ') || '—';
        md += `| ${r.icon} | ${caso} | ${r.name} | ${r.code} | ${r.responseTime}ms | ${r.verdict} |\n`;
      });
    });

  md += '\n---\n\n## Detalle por prueba\n\n';

  rows.forEach((r, idx) => {
    const caseId = primaryCaseId(r.caseIds);
    const catalog = CASE_CATALOG[caseId] || CASE_CATALOG.Setup;

    md += `### ${idx + 1}. ${r.name}\n\n`;
    md += `| Campo | Valor |\n|-------|-------|\n`;
    md += `| **Ticket Jira** | ${catalog.ticket || r.ticket} |\n`;
    md += `| **Caso** | ${r.caseIds.join(', ') || '—'} |\n`;
    md += `| **Resultado** | ${r.icon} ${r.verdict} |\n`;
    md += `| **Método** | \`${r.method}\` |\n`;
    md += `| **URL** | \`${r.url}\` |\n`;
    md += `| **HTTP** | ${r.code} |\n`;
    md += `| **Tiempo** | ${r.responseTime} ms |\n`;
    md += `| **Objetivo** | ${catalog.objetivo} |\n`;
    md += `| **Esperado** | ${catalog.esperado} |\n`;
    md += `| **Conclusión** | ${r.nota} |\n\n`;

    md += `**Assertions:**\n\n`;
    if (r.assertions.length === 0) {
      md += `- _(sin tests automatizados — solo request de apoyo)_\n\n`;
    } else {
      r.assertions.forEach((a) => {
        const ok = !a.error;
        md += `- ${ok ? '✅' : '❌'} \`${a.assertion}\`${a.error ? ` — ${a.error.message}` : ''}\n`;
      });
      md += '\n';
    }

    const bodySummary = summarizeBody(r.name, r.code, r.body);
    if (bodySummary !== '—') {
      md += `**Respuesta (resumen):** ${bodySummary}\n\n`;
    }
  });

  const failures = rows.filter((r) => r.icon === '❌');
  if (failures.length) {
    md += '\n---\n\n## Fallos — registrar BUG\n\n';
    failures.forEach((r) => {
      md += `### ${r.name}\n`;
      md += `- **HTTP:** ${r.code}\n`;
      md += `- **Error:** ${r.nota}\n`;
      md += `- **Plantilla:** [[Guia Postman SV — Pruebas y Documentacion]]\n\n`;
    });
  }

  const infra = rows.filter((r) => r.icon === '⚠️');
  if (infra.length) {
    md += '\n---\n\n## Observaciones infra (no bloquean Postman)\n\n';
    infra.forEach((r) => {
      md += `- **${r.name}** — HTTP ${r.code}: ${r.nota}\n`;
    });
    md += '\n> Acción: verificar webhook n8n en Azure App Settings / URL del workflow activo.\n';
  }

  md += `\n---\n\n## Pendiente manual (app)\n\n`;
  md += `| Ticket | Qué probar en dispositivo |\n`;
  md += `|--------|---------------------------|\n`;
  md += `| SCRUM-67 | Dashboard tendero, clientes, alertas en UI |\n`;
  md += `| SCRUM-115 | Home cliente, historial, deudas por tienda |\n`;
  md += `| SCRUM-72 | Navegación, estados vacío/error, UX |\n`;
  md += `| SCRUM-116 | Push notifications |\n`;
  md += `| SCRUM-56 | Pantalla Analítica vs API ANA-04 |\n`;
  md += `| SCRUM-54 | ASIS-04 a ASIS-14 en chat móvil |\n`;

  return md;
}

function main() {
  const report = loadReport();
  const markdown = buildMarkdown(report);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');

  const htmlSrc = path.join(__dirname, 'reports', 'postman-report.html');
  const htmlDst = path.join(
    OBSIDIAN_VAULT,
    '..',
    'Adjuntos',
    `postman-report-${dateStr}.html`,
  );

  console.log(`\n✅ Nota Obsidian: ${OUTPUT_FILE}`);
  console.log(`   (${markdown.split('\n').length} líneas — detalle ampliado)`);

  if (fs.existsSync(htmlSrc)) {
    fs.mkdirSync(path.dirname(htmlDst), { recursive: true });
    fs.copyFileSync(htmlSrc, htmlDst);
    console.log(`✅ Reporte HTML:  ${htmlDst}`);
  }

  const failed = report.run?.stats?.assertions?.failed ?? 0;
  process.exit(failed > 0 ? 1 : 0);
}

main();

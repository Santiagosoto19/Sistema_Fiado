const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURAÇÃO DE OFFSETS (IDs existentes na base de dados)
// =============================================================================
const OFFSETS = {
  usuario: 10,        // existem 1-10
  tenderos: 5,        // existem 1-5
  clientes: 5,        // existem 1-5
  tendero_cliente: 10,// existem 1-10
  creditos: 35,       // existem 1-35
  abonos: 20,         // existem 1-20
  alertas: 20,        // existem 1-20
  recordatorios: 15, // existem 1-15
  scoring: 5,         // existem 1-5
  metricas_cartera: 5 // existem 1-5
};

// =============================================================================
// DADOS BASE (originais do usuário)
// =============================================================================

// 2. USUARIOS (50 tenderos + 50 clientes)
const tenderoEmails = Array.from({length: 50}, (_, i) => `tendero${i+1}@tiendasegura.com`);
const clienteEmails = Array.from({length: 50}, (_, i) => `cliente${i+1}@correo.com`);

// 3. TENDEROS
const nombresTendero = [
  'Sandra Mendoza','Ramiro Rodríguez','David Mora','Jorge Vergara','Patricia Vergara',
  'Álvaro Buelvas','heavy Buelvas','Beatriz Paternina','Clara Buelvas','Inés Vargas',
  'José Buelvas','Sonia Cardona','Ana Peña','Beatriz Vergara','Diana Vergara',
  'Cecilia Olivera','Beatriz Cardona','Patricia Buelvas','Ana Mora','Pedro Buelvas',
  'Luz Olivera','Alberto Ruiz','Sonia Mora','Jaime Paternina','Laura Olivera',
  'Inés Paternina','José Olivera','Sonia Buelvas','Ana Paternina','Beatriz Paternina',
  'Diana Buelvas','Cecilia Olivera','Beatriz Cardona','Patricia Buelvas','Ana Mora',
  'Sandra Mendoza','Ramiro Rodríguez','David Mora','Jorge Vergara','Patricia Vergara',
  'Álvaro Buelvas','heavy Buelvas','Beatriz Paternina','Clara Buelvas','Inés Vargas',
  'José Buelvas','Sonia Cardona','Ana Peña','Beatriz Vergara','Diana Vergara'
];
const tiendas = [
  'Abarrotes El Vecino','Minimercado La Economía','Miscelánea Sucre','Miscelánea Sucre','Tienda La Bendición',
  'Tienda La Bendición','Tienda El Progreso','Tienda El Progreso','Abarrotes El Vecino','Tienda El Progreso',
  'Tienda El Progreso','Tienda La Bendición','Minimercado La Economía','Abarrotes El Vecino','Tienda El Progreso',
  'Tienda La Bendición','Minimercado La Economía','Minimercado La Economía','Miscelánea Sucre','Miscelánea Sucre',
  'Abarrotes El Vecino','Tienda La Bendición','Tienda El Progreso','Tienda El Progreso','Abarrotes El Vecino',
  'Tienda El Progreso','Tienda El Progreso','Tienda La Bendición','Minimercado La Economía','Abarrotes El Vecino',
  'Tienda El Progreso','Tienda La Bendición','Minimercado La Economía','Minimercado La Economía','Miscelánea Sucre',
  'Abarrotes El Vecino','Minimercado La Economía','Miscelánea Sucre','Miscelánea Sucre','Tienda La Bendición',
  'Tienda La Bendición','Tienda El Progreso','Tienda El Progreso','Abarrotes El Vecino','Tienda El Progreso',
  'Tienda El Progreso','Tienda La Bendición','Minimercado La Economía','Abarrotes El Vecino','Tienda El Progreso'
];
const telefonosTendero = [
  '3007014387','3007462002','3002231269','3009772393','3009383615',
  '3001358999','3007559190','3003714247','3008985172','3006240228',
  '3002621980','3006767576','3006282833','3005822394','3008064972',
  '3005504021','3008985168','3001859368','3002573215','3009772390',
  '3004383615','3001358911','3007559122','3003714211','3008985100',
  '3006240211','3002621900','3006767511','3006282811','3005822311',
  '3008064911','3005504011','3008985111','3001859311','3002573211',
  '3007014311','3007462011','3002231211','3009772311','3009383611',
  '3001358911','3007559111','3003714211','3008985111','3006240211',
  '3002621911','3006767511','3006282811','3005822311','3008064911'
];
const direccionesTendero = [
  'Calle 3 #13-8, Sincelejo','Calle 28 #11-73, Corozal','Calle 23 #22-54, Morroa','Calle 31 #12-84, Los Palmitos','Calle 4 #19-41, Sampues',
  'Calle 25 #23-38, Sincelejo','Calle 32 #20-22, Sampues','Calle 25 #24-73, Sincelejo','Calle 29 #10-44, Sincelejo','Calle 25 #7-16, Corozal',
  'Calle 4 #20-77, Sampues','Calle 21 #6-83, Sampues','Calle 28 #16-83, Los Palmitos','Calle 28 #4-52, Sincelejo','Calle 16 #22-29, Sincelejo',
  'Calle 40 #18-20, Sincelejo','Calle 37 #22-79, Sincelejo','Calle 28 #26-70, Sincelejo','Calle 1 #27-56, Sincelejo','Calle 13 #12-84, Sampues',
  'Calle 4 #9-41, Morroa','Calle 5 #23-38, Corozal','Calle 12 #20-22, Sincelejo','Calle 15 #24-73, Sincelejo','Calle 19 #10-44, Sincelejo',
  'Calle 15 #7-16, Corozal','Calle 14 #20-77, Sampues','Calle 11 #6-83, Sampues','Calle 18 #16-83, Los Palmitos','Calle 18 #4-52, Sincelejo',
  'Calle 6 #22-29, Sincelejo','Calle 10 #18-20, Sincelejo','Calle 17 #22-79, Sincelejo','Calle 18 #26-70, Sincelejo','Calle 11 #27-56, Sincelejo',
  'Calle 13 #13-8, Sincelejo','Calle 18 #11-73, Corozal','Calle 13 #22-54, Morroa','Calle 11 #12-84, Los Palmitos','Calle 14 #19-41, Sampues',
  'Calle 15 #23-38, Sincelejo','Calle 12 #20-22, Sampues','Calle 15 #24-73, Sincelejo','Calle 19 #10-44, Sincelejo','Calle 15 #7-16, Corozal',
  'Calle 14 #20-77, Sampues','Calle 11 #6-83, Sampues','Calle 18 #16-83, Los Palmitos','Calle 18 #4-52, Sincelejo','Calle 16 #22-29, Sincelejo'
];
const camarasTendero = Array.from({length: 50}, (_, i) => `CC-${String(522199+i).slice(-6)}-${i+1}`);

// 4. CLIENTES
const nombresCliente = [
  'Juan Ruiz','Pedro Pedroza','Ana Castro','Luis Peña','Rosa Mora',
  'Andrés Gómez','María Rodríguez','Carlos Martínez','Sandra Hernández','Jorge López',
  'Diana Pérez','heavy González','José Sánchez','Carmen Ramírez','Manuel Torres',
  'Elena Flores','santiago Díaz','Camila Vargas','David Ríos','Laura Álvarez',
  'alberto Romero','Patricia Mendoza','Fernando García','Sonia Cardona','Ricardo Mejía',
  'Beatriz Jiménez','jairo Asturias','Gloria Buelvas','Héctor Toscano','Olga Paternina',
  'Álvaro Vergara','Martha Mercado','Gustavo Suárez','Cecilia Salazar','Iván Villegas',
  'Clara Quintero','Óscar Acevedo','Inés Correa','César Montoya','Silvia Orozco',
  'Ramiro Chávez','Alicia Barrios','Mauricio Miranda','Ángela Benítez','Jaime Serrano',
  'Verónica Tapia','Rodrigo Almanza','Luz Arrieta','Fabio Narváez','Milena Olivera'
];
const telefonosCliente = [
  '3128189569','3130198089','3122180845','3124898135','3116858224',
  '3105741630','3122396490','3146430349','3131758557','3143537233',
  '3141753177','3116120563','3103407983','3109312152','3119100129',
  '3116790938','3111059530','3149591475','3104192661','3111453006',
  '3113197607','3119420042','3112613143','3142750058','3111718768',
  '3132049077','3128828062','3144883478','3129344449','3131711200',
  '3135431694','3121516086','3121876402','3146447814','3145415444',
  '3124118431','3134114251','3145151515','3101115161','3115456455',
  '3145455644','3112234555','3114555466','3134556444','3112111455',
  '3144455556','3111222344','3104545455','3114545556','3144545555'
];
const direccionesCliente = [
  'Cra 5 #45-12, Sincelejo','Cra 15 #50-18, Los Palmitos','Cra 11 #1-20, Sincelejo','Cra 30 #28-40, Corozal','Cra 21 #6-24, Sincelejo',
  'Cra 1 #42-12, Morroa','Cra 9 #32-13, Corozal','Cra 6 #29-37, Sampues','Cra 4 #20-56, Corozal','Cra 30 #5-29, Sincelejo',
  'Cra 20 #34-31, Sincelejo','Cra 11 #45-38, Sincelejo','Cra 27 #50-58, Sincelejo','Cra 11 #12-42, Sampues','Cra 11 #21-16, Sampues',
  'Cra 1 #48-26, Corozal','Cra 6 #21-39, Sincelejo','Cra 29 #17-27, Sincelejo','Cra 27 #6-58, Sincelejo','Cra 4 #4-4, Morroa',
  'Cra 11 #24-1, Sampues','Cra 21 #46-17, Sincelejo','Cra 17 #30-22, Sincelejo','Cra 17 #36-54, Morroa','Cra 6 #49-59, Sincelejo',
  'Cra 3 #48-2, Los Palmitos','Cra 9 #31-18, Sincelejo','Cra 4 #33-11, Sincelejo','Cra 10 #17-38, Sincelejo','Cra 18 #34-45, Corozal',
  'Cra 1 #42-12, Sampues','Cra 30 #5-29, Sincelejo','Cra 10 #17-38, Sincelejo','Cra 11 #12-42, Morroa','Cra 11 #21-16, Corozal',
  'Cra 1 #48-26, Sincelejo','Cra 29 #17-27, Sincelejo','Cra 27 #6-58, Sincelejo','Cra 4 #4-4, Los Palmitos','Cra 11 #24-1, Sampues',
  'Cra 17 #30-22, Sincelejo','Cra 17 #36-54, Sincelejo','Cra 6 #49-59, Sincelejo','Cra 3 #48-2, Corozal','Cra 9 #31-18, Sampues',
  'Cra 4 #33-11, Sincelejo','Cra 21 #46-17, Sincelejo','Cra 20 #34-31, Corozal','Cra 11 #45-38, Morroa','Cra 27 #50-58, Los Palmitos'
];

// =============================================================================
// HELPERS
// =============================================================================
function escape(val) {
  if (typeof val === 'string') return "'" + val.replace(/'/g, "''") + "'";
  if (val === null || val === undefined) return 'NULL';
  return val;
}

function buildInsert(table, columns, rows) {
  if (rows.length === 0) return '';
  const vals = rows.map(row => '(' + row.map(escape).join(', ') + ')').join(',\n');
  return `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n${vals};\n\n`;
}

// =============================================================================
// GERAÇÃO DOS DADOS
// =============================================================================

let sql = `-- =============================================================================
-- SEED ESTENDIDO CORRIGIDO PARA FIADOCHECK
-- Gerado automaticamente com offsets para evitar conflitos de PK
-- Correções aplicadas: roles, estados 'pago'→'pagado', tipos de alerta, níveis de risco
-- =============================================================================\n\n`;

// 2. USUARIOS
const usuarios = [];
for (let i = 0; i < 50; i++) {
  usuarios.push([
    OFFSETS.usuario + i + 1,                    // id_usuario (11-60)
    tenderoEmails[i],
    '$2b$12$Ex.PlaceholderPasswordHashForTestingPurposesOnly$',
    1,                                          // CORREÇÃO: id_rol=1 (tendero)
    'activo',
    '2026-01-15 08:00:00'
  ]);
}
for (let i = 0; i < 50; i++) {
  usuarios.push([
    OFFSETS.usuario + 50 + i + 1,               // id_usuario (61-110)
    clienteEmails[i],
    '$2b$12$Ex.PlaceholderPasswordHashForTestingPurposesOnly$',
    2,                                          // CORREÇÃO: id_rol=2 (cliente)
    i >= 48 ? 'inactivo' : 'activo',           // últimos 2 inativos
    '2026-02-01 10:30:00'
  ]);
}
sql += buildInsert('usuario',
  ['id_usuario','email','password','id_rol','estado','created_at'],
  usuarios
);

// 3. TENDEROS
const tenderos = [];
for (let i = 0; i < 50; i++) {
  tenderos.push([
    OFFSETS.tenderos + i + 1,                   // id_tendero (6-55)
    OFFSETS.usuario + i + 1,                    // id_usuario (11-60)
    nombresTendero[i],
    `${tiendas[i]} ${i+1}`,
    telefonosTendero[i],
    direccionesTendero[i],
    camarasTendero[i],
    true,
    '2026-01-15 08:30:00'
  ]);
}
sql += buildInsert('tenderos',
  ['id_tendero','id_usuario','nombre','nombre_tienda','telefono','direccion','num_camara_comercio','estado','created_at'],
  tenderos
);

// 4. CLIENTES
const clientes = [];
for (let i = 0; i < 50; i++) {
  clientes.push([
    OFFSETS.clientes + i + 1,                   // id_cliente (6-55)
    OFFSETS.usuario + 50 + i + 1,               // id_usuario (61-110)
    nombresCliente[i],
    telefonosCliente[i],
    direccionesCliente[i],
    i >= 48 ? 'inactivo' : 'activo',           // últimos 2 inativos
    '2026-02-01 11:00:00'
  ]);
}
sql += buildInsert('clientes',
  ['id_cliente','id_usuario','nombre_completo','telefono','direccion','estado','created_at'],
  clientes
);

// 5. TENDERO_CLIENTE
const tenderoCliente = [];
for (let i = 0; i < 50; i++) {
  tenderoCliente.push([
    OFFSETS.tendero_cliente + i + 1,            // id (11-60)
    OFFSETS.tenderos + i + 1,                   // id_tendero (6-55)
    OFFSETS.clientes + i + 1,                   // id_cliente (6-55)
    'activo',
    '2026-02-05 14:00:00'
  ]);
}
sql += buildInsert('tendero_cliente',
  ['id','id_tendero','id_cliente','estado','created_at'],
  tenderoCliente
);

// 6. CRÉDITOS (80 registros)
const creditos = [];
// Grupo 1: 30 créditos (clientes 1-15 → 6-20), 2 por cliente
const descG1 = [
  ['Mercado familiar','Carnes y lácteos'],['Útiles escolares','Compra mensual'],
  ['Productos del hogar','Mercado quincenal'],['Productos del hogar','Productos de limpieza'],
  ['Abarrotes del mes','Mercado completo'],['Abarrotes del mes','Bebidas y snacks'],
  ['Mercado quincenal','Bebidas y snacks'],['Verduras y frutas','Fiado de emergencia'],
  ['Verduras y frutas','Mercado familiar'],['Compra mensual','Granos y enlatados'],
  ['Pan y lácteos','Productos del hogar'],['Granos y enlatados','Pan y lácteos'],
  ['Abarrotes del mes','Carnes y lácteos'],['Mercado familiar','Mercado quincenal'],
  ['Útiles escolares','Abarrotes del mes']
];
for (let c = 0; c < 15; c++) {
  const cliente = OFFSETS.clientes + c + 1;   // 6-20
  const tendero = OFFSETS.tenderos + c + 1;    // 6-20
  // crédito 1 do cliente (índice par)
  const idCred1 = OFFSETS.creditos + c*2 + 1;  // 36, 38, ..., 64
  creditos.push([
    idCred1, cliente, tendero,
    [40000,70000,100000,110000,80000,70000,70000,100000,70000,50000,80000,60000,70000,110000,40000][c],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0][c],
    descG1[c][0], '2026-03-01', '2026-04-01',
    'pagado', '2026-03-01 09:00:00'
  ]);
  // crédito 2 do cliente (índice ímpar)
  const idCred2 = OFFSETS.creditos + c*2 + 2;  // 37, 39, ..., 65
  creditos.push([
    idCred2, cliente, tendero,
    [90000,130000,120000,100000,140000,120000,50000,110000,130000,80000,50000,70000,120000,100000,120000][c],
    [80000,80000,60000,30000,50000,80000,30000,50000,70000,20000,10000,30000,70000,50000,80000][c],
    descG1[c][1], '2026-05-01', '2026-06-01',
    'vigente', '2026-05-01 10:00:00'
  ]);
}

// Grupo 2: 15 créditos vencidos (clientes 16-30 → 21-35)
const descG2 = [
  'Mercado completo','Productos del hogar','Mercado familiar','Productos de limpieza','Mercado semanal',
  'Compra mensual','Mercado familiar','Productos del hogar','Fiado de emergencia','Productos del hogar',
  'Granos y enlatados','Productos del hogar','Mercado familiar','Bebidas y snacks','Fiado de emergencia'
];
for (let c = 0; c < 15; c++) {
  const cliente = OFFSETS.clientes + 15 + c + 1;  // 21-35
  const tendero = OFFSETS.tenderos + 15 + c + 1; // 21-35
  const idCred = OFFSETS.creditos + 30 + c + 1;   // 66-80
  creditos.push([
    idCred, cliente, tendero,
    [150000,100000,80000,120000,100000,170000,110000,70000,140000,90000,170000,80000,120000,60000,90000][c],
    [150000,100000,80000,120000,100000,170000,110000,70000,140000,90000,170000,80000,120000,60000,90000][c],
    descG2[c], '2026-03-15', '2026-04-15',
    'vencido', '2026-03-15 15:22:00'
  ]);
}

// Grupo 3: 30 créditos pagados (clientes 31-45 → 36-50), 2 por cliente
const descG3 = [
  ['Mercado familiar','Verduras y frutas'],['Pan y lácteos','Mercado familiar'],
  ['Bebidas y snacks','Abarrotes del mes'],['Pan y lácteos','Granos y enlatados'],
  ['Carnes y lácteos','Productos de limpieza'],['Mercado semanal','Bebidas y snacks'],
  ['Compra mensual','Productos del hogar'],['Abarrotes del mes','Abarrotes del mes'],
  ['Productos del hogar','Mercado quincenal'],['Productos de limpieza','Útiles escolares'],
  ['Verduras y frutas','Carnes y lácteos'],['Mercado familiar','Fiado de emergencia'],
  ['Productos del hogar','Mercado completo'],['Productos de limpieza','Fiado de emergencia'],
  ['Productos del hogar','Mercado completo']
];
for (let c = 0; c < 15; c++) {
  const cliente = OFFSETS.clientes + 30 + c + 1;  // 36-50
  const tendero = OFFSETS.tenderos + 30 + c + 1;   // 36-50
  const idCred1 = OFFSETS.creditos + 45 + c*2 + 1;  // 81, 83, ..., 109
  creditos.push([
    idCred1, cliente, tendero,
    [50000,30000,30000,40000,30000,60000,80000,50000,60000,40000,70000,60000,50000,40000,50000][c],
    0,
    descG3[c][0], '2026-02-10', '2026-03-10',
    'pagado', '2026-02-10 12:00:00'
  ]);
  const idCred2 = OFFSETS.creditos + 45 + c*2 + 2;  // 82, 84, ..., 110
  creditos.push([
    idCred2, cliente, tendero,
    [70000,50000,30000,30000,80000,60000,60000,80000,80000,40000,40000,40000,80000,30000,60000][c],
    0,
    descG3[c][1], '2026-02-10', '2026-03-10',
    'pagado', '2026-02-10 12:00:00'
  ]);
}

// Grupo 4: 5 créditos vigentes (clientes 46-50 → 51-55)
const descG4 = [
  'Verduras y frutas','Fiado de emergencia','Granos y enlatados','Bebidas y snacks','Mercado quincenal'
];
for (let c = 0; c < 5; c++) {
  const cliente = OFFSETS.clientes + 45 + c + 1;  // 51-55
  const tendero = OFFSETS.tenderos + 45 + c + 1; // 51-55
  const idCred = OFFSETS.creditos + 75 + c + 1;    // 111-115
  creditos.push([
    idCred, cliente, tendero,
    [40000,60000,70000,70000,40000][c],
    [40000,60000,70000,70000,40000][c],
    descG4[c], '2026-05-12', '2026-06-12',
    'vigente', '2026-05-12 16:45:00'
  ]);
}

sql += buildInsert('creditos',
  ['id_credito','id_cliente','id_tendero','monto_total','saldo_pendiente','descripcion','fecha_credito','fecha_limite_pago','estado','created_at'],
  creditos
);

// 7. ABONOS (60 registros)
const abonos = [];
// Abonos 1-30 → 21-50 (para créditos 36-65)
const montosAbonoG1 = [
  40000,10000,70000,50000,10000,60000,110000,70000,80000,90000,
  70000,40000,70000,20000,100000,60000,70000,60000,50000,60000,
  80000,40000,60000,40000,70000,50000,110000,50000,40000,40000
];
const fechasAbonoG1 = [
  '2026-03-28','2026-05-10','2026-03-28','2026-05-10','2026-03-28','2026-05-10',
  '2026-03-28','2026-05-10','2026-03-28','2026-05-10','2026-03-28','2026-05-10',
  '2026-03-28','2026-05-10','2026-03-28','2026-05-10','2026-03-28','2026-05-10',
  '2026-03-28','2026-05-10','2026-03-28','2026-05-10','2026-03-28','2026-05-10',
  '2026-03-28','2026-05-10','2026-03-28','2026-05-10','2026-03-28','2026-05-10'
];
for (let i = 0; i < 30; i++) {
  const idCred = OFFSETS.creditos + i + 1;  // 36-65
  // cliente: créditos 36-37 → cliente 6, 38-39 → cliente 7, etc.
  const clienteOffset = Math.floor(i / 2);   // 0-14
  const cliente = OFFSETS.clientes + clienteOffset + 1;  // 6-20
  abonos.push([
    OFFSETS.abonos + i + 1,                   // 21-50
    idCred, cliente,
    montosAbonoG1[i],
    fechasAbonoG1[i], fechasAbonoG1[i] + ' 17:00:00'
  ]);
}

// Abonos 31-60 → 51-80 (para créditos 81-110)
const montosAbonoG2 = [
  50000,70000,30000,50000,30000,30000,40000,30000,30000,80000,
  60000,60000,80000,60000,50000,80000,60000,80000,40000,40000,
  70000,40000,60000,40000,50000,80000,40000,30000,50000,60000
];
for (let i = 0; i < 30; i++) {
  const idCred = OFFSETS.creditos + 45 + i + 1;  // 81-110
  const clienteOffset = Math.floor(i / 2) + 30;   // 30-44
  const cliente = OFFSETS.clientes + clienteOffset + 1;  // 36-50
  abonos.push([
    OFFSETS.abonos + 30 + i + 1,               // 51-80
    idCred, cliente,
    montosAbonoG2[i],
    '2026-03-05', '2026-03-05 18:00:00'
  ]);
}

sql += buildInsert('abonos',
  ['id_abono','id_credito','id_cliente','monto','fecha_abono','created_at'],
  abonos
);

// 8. ALERTAS (15 registros)
const alertas = [];
const diasAtrasoAlertas = [24,17,18,20,22,32,15,34,20,34,17,28,18,20,15];
for (let i = 0; i < 15; i++) {
  const cliente = OFFSETS.clientes + 15 + i + 1;   // 21-35
  const tendero = OFFSETS.tenderos + 15 + i + 1;  // 21-35
  const credito = OFFSETS.creditos + 30 + i + 1;  // 66-80
  alertas.push([
    OFFSETS.alertas + i + 1,                       // 21-35
    cliente, credito, tendero,
    'pago_vencido',                                 // CORREÇÃO
    diasAtrasoAlertas[i],
    false,
    '2026-04-20 06:00:00'
  ]);
}
sql += buildInsert('alertas',
  ['id_alertas','id_cliente','id_credito','id_tendero','tipo','dias_atraso','leida','created_at'],
  alertas
);

// 9. RECORDATORIOS (15 registros)
const recordatorios = [];
const mensajesRecordatorio = [
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.',
  'Estimado cliente, le recordamos su saldo pendiente por pagar.'
];
for (let i = 0; i < 15; i++) {
  const cliente = OFFSETS.clientes + 15 + i + 1;   // 21-35
  const tendero = OFFSETS.tenderos + 15 + i + 1;  // 21-35
  const credito = OFFSETS.creditos + 30 + i + 1;  // 66-80
  recordatorios.push([
    OFFSETS.recordatorios + i + 1,                   // 16-30
    cliente, credito, tendero,
    'whatsapp',                                     // CORREÇÃO: lowercase consistente
    mensajesRecordatorio[i],
    'enviado',
    '2026-05-05 09:30:00'
  ]);
}
sql += buildInsert('recordatorios',
  ['id_recordatorios','id_cliente','id_credito','id_tendero','canal','mensaje','estado_envio','created_at'],
  recordatorios
);

// 10. SCORING (50 registros)
const scoring = [];
const nivelesRiesgo = [
  'bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo',
  'bajo','bajo','bajo','bajo','bajo',
  'alto','alto','alto','alto','alto','alto','alto','alto','alto','alto',
  'alto','alto','alto','alto','alto',
  'bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo','bajo',
  'bajo','bajo','bajo','bajo','bajo',
  'medio','medio','medio','medio','medio'
];
const puntajes = [
  78,78,78,78,78,78,78,78,78,78,78,78,78,78,78,
  34,34,34,34,34,34,34,34,34,34,34,34,34,34,34,
  85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,
  50,50,50,50,50
];
const puntualidad = [
  20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,
  5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
  25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,
  10,10,10,10,10
];
const historial = [
  20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,
  5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,
  25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,
  10,10,10,10,10
];
const frecuencia = [
  15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,
  10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
  20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,
  5,5,5,5,5
];
const antiguedad = [
  15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,
  10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
  15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,
  5,5,5,5,5
];
const limites = [
  300000,300000,300000,300000,300000,300000,300000,300000,300000,300000,
  300000,300000,300000,300000,300000,
  50000,50000,50000,50000,50000,50000,50000,50000,50000,50000,
  50000,50000,50000,50000,50000,
  500000,500000,500000,500000,500000,500000,500000,500000,500000,500000,
  500000,500000,500000,500000,500000,
  100000,100000,100000,100000,100000
];
for (let i = 0; i < 50; i++) {
  scoring.push([
    OFFSETS.scoring + i + 1,                       // 6-55
    OFFSETS.clientes + i + 1,                       // 6-55
    puntajes[i],
    nivelesRiesgo[i],                               // CORREÇÃO
    puntualidad[i],
    historial[i],
    frecuencia[i],
    antiguedad[i],
    limites[i],
    '2026-05-15 23:00:00'
  ]);
}
sql += buildInsert('scoring',
  ['id_scoring','id_cliente','puntaje','nivel_riesgo','pts_puntualidad','pts_historial','pts_frecuencia','pts_antiguedad','limite_sugerido','fecha_calculo'],
  scoring
);

// 11. METRICAS
const metricas = [];
for (let i = 0; i < 5; i++) {
  metricas.push([
    OFFSETS.metricas_cartera + i + 1,              // 6-10
    OFFSETS.tenderos + i + 1,                       // 6-10
    '2026-05-18',
    250000.00, 50000.00, 200000.00, 20.00, 12.50, 4, 1
  ]);
}
sql += buildInsert('metricas_cartera',
  ['id_cartera','id_tendero','fecha','monto_total_fiado','monto_vencido','monto_vigente','porcentaje_mora','dias_promedio_atraso','clientes_al_dia','clientes_en_mora'],
  metricas
);

// 12. SEQUENCES
sql += `-- =============================================================================\n`;
sql += `-- 12. ATUALIZAÇÃO DE SEQUÊNCIAS\n`;
sql += `-- =============================================================================\n`;
sql += `SELECT setval(pg_get_serial_sequence('"roles"', 'id_rol'), COALESCE(MAX("id_rol"), 1)) FROM "roles";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"usuario"', 'id_usuario'), COALESCE(MAX("id_usuario"), 1)) FROM "usuario";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"tenderos"', 'id_tendero'), COALESCE(MAX("id_tendero"), 1)) FROM "tenderos";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"clientes"', 'id_cliente'), COALESCE(MAX("id_cliente"), 1)) FROM "clientes";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"tendero_cliente"', 'id'), COALESCE(MAX("id"), 1)) FROM "tendero_cliente";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"creditos"', 'id_credito'), COALESCE(MAX("id_credito"), 1)) FROM "creditos";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"abonos"', 'id_abono'), COALESCE(MAX("id_abono"), 1)) FROM "abonos";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"alertas"', 'id_alertas'), COALESCE(MAX("id_alertas"), 1)) FROM "alertas";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"recordatorios"', 'id_recordatorios'), COALESCE(MAX("id_recordatorios"), 1)) FROM "recordatorios";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"scoring"', 'id_scoring'), COALESCE(MAX("id_scoring"), 1)) FROM "scoring";\n`;
sql += `SELECT setval(pg_get_serial_sequence('"metricas_cartera"', 'id_cartera'), COALESCE(MAX("id_cartera"), 1)) FROM "metricas_cartera";\n`;

const outPath = path.join(__dirname, 'seed_extended_corrected.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('Arquivo gerado:', outPath);
console.log('Total de registros:');
console.log('  Usuários:', usuarios.length);
console.log('  Tenderos:', tenderos.length);
console.log('  Clientes:', clientes.length);
console.log('  Tendero_cliente:', tenderoCliente.length);
console.log('  Créditos:', creditos.length);
console.log('  Abonos:', abonos.length);
console.log('  Alertas:', alertas.length);
console.log('  Recordatorios:', recordatorios.length);
console.log('  Scoring:', scoring.length);
console.log('  Métricas:', metricas.length);

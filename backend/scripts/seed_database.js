// backend/scripts/seed_database.js
// Este script limpia y puebla la base de datos con datos coherentes y relacionados.
require('dotenv').config({ path: 'backend/.env' });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

async function seed() {
  console.log('🚀 Iniciando poblado de base de datos...');

  try {
    // 1. Limpieza de datos (en orden inverso a las FKs)
    console.log('🧹 Limpiando datos antiguos...');
    await pool.query('TRUNCATE TABLE sesiones CASCADE');
    await pool.query('TRUNCATE TABLE abonos CASCADE');
    await pool.query('TRUNCATE TABLE creditos CASCADE');
    await pool.query('TRUNCATE TABLE clientes CASCADE');
    await pool.query('TRUNCATE TABLE tenderos CASCADE');
    await pool.query('TRUNCATE TABLE usuario CASCADE');

    // 2. Crear Usuarios (Hash de contraseña: 'password123')
    console.log('👥 Creando usuarios...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const usersData = [
      { email: 'tendero@fiado.com', password: passwordHash, id_rol: 1 }, // Tendero
      { email: 'cliente1@gmail.com', password: passwordHash, id_rol: 2 }, // Cliente 1
      { email: 'cliente2@gmail.com', password: passwordHash, id_rol: 2 }, // Cliente 2
    ];

    const users = [];
    for (const u of usersData) {
      const res = await pool.query(
        'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
        [u.email, u.password, u.id_rol, 'activo']
      );
      users.push(res.rows[0].id_usuario);
    }

    // 3. Crear Tendero
    console.log('🏪 Creando tendero...');
    const tenderoRes = await pool.query(
      'INSERT INTO tenderos (id_usuario, nombre, nombre_tienda, telefono, direccion) VALUES ($1, $2, $3, $4, $5) RETURNING id_tendero',
      [users[0], 'Carlos Tendero', 'La Tiendita de Carlos', '+573001112233', 'Calle Principal #123']
    );
    const idTendero = tenderoRes.rows[0].id_tendero;

    // 4. Crear Clientes
    console.log('👤 Creando clientes...');
    const clientesData = [
      { user_id: users[1], nombre: 'Ana Ruiz', telefono: '+573004445566', estado: 'activo' },
      { user_id: users[2], nombre: 'Luis Castro', telefono: '+573007778899', estado: 'activo' },
    ];

    const clientesIds = [];
    for (const c of clientesData) {
      const res = await pool.query(
        'INSERT INTO clientes (id_usuario, nombre_completo, telefono, estado) VALUES ($1, $2, $3, $4) RETURNING id_cliente',
        [c.user_id, c.nombre, c.telefono, c.estado]
      );
      clientesIds.push(res.rows[0].id_cliente);
    }

    // 5. Crear Créditos (Relacionados con Tendero y Clientes)
    console.log('💳 Creando créditos...');
    const creditosData = [
      { cliente_id: clientesIds[0], monto: 50000, desc: 'Compra de víveres', fecha: '2026-01-10' },
      { cliente_id: clientesIds[0], monto: 20000, desc: 'Artículos de aseo', fecha: '2026-02-15' },
      { cliente_id: clientesIds[1], monto: 100000, desc: 'Compra mayorista', fecha: '2026-03-01' },
    ];

    const creditosIds = [];
    for (const cr of creditosData) {
      const res = await pool.query(
        'INSERT INTO creditos (id_cliente, id_tendero, monto_total, descripcion, fecha_credito) VALUES ($1, $2, $3, $4, $5) RETURNING id_credito',
        [cr.cliente_id, idTendero, cr.monto, cr.desc, cr.fecha]
      );
      creditosIds.push(res.rows[0].id_credito);
    }

    // 6. Crear Abonos (Relacionados con Créditos)
    console.log('💰 Creando abonos...');
    await pool.query(
      'INSERT INTO abonos (id_credito, monto, fecha_abono) VALUES ($1, $2, $3)',
      [creditosIds[0], 15000, '2026-01-20']
    );
    await pool.query(
      'INSERT INTO abonos (id_credito, monto, fecha_abono) VALUES ($1, $2, $3)',
      [creditosIds[1], 5000, '2026-02-20']
    );
    await pool.query(
      'INSERT INTO abonos (id_credito, monto, fecha_abono) VALUES ($1, $2, $3)',
      [creditosIds[2], 20000, '2026-03-10']
    );

    console.log('\n✅ ¡Base de datos poblada con éxito!');
    console.log('-------------------------------------------');
    console.log('📧 Tendero: tendero@fiado.com | Pass: password123');
    console.log('📧 Cliente 1: cliente1@gmail.com | Pass: password123');
    console.log('📧 Cliente 2: cliente2@gmail.com | Pass: password123');
    console.log('-------------------------------------------');

  } catch (err) {
    console.error('❌ Error poblando la base de datos:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

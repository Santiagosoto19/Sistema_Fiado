// Corrige soto@fiado.com: rol cliente + registro en clientes + vínculo con tendero.
require('dotenv').config();
const pool = require('../src/config/database');

const EMAIL = 'soto@fiado.com';

async function fixSotoAsCliente() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT id_usuario FROM usuario WHERE email = $1',
      [EMAIL]
    );

    if (userRes.rows.length === 0) {
      throw new Error(`No existe usuario con email ${EMAIL}`);
    }

    const idUsuario = userRes.rows[0].id_usuario;

    await client.query(
      'UPDATE usuario SET id_rol = 2, estado = $1 WHERE id_usuario = $2',
      ['activo', idUsuario]
    );

    const clienteExistente = await client.query(
      'SELECT id_cliente FROM clientes WHERE id_usuario = $1',
      [idUsuario]
    );

    let idCliente;
    if (clienteExistente.rows.length > 0) {
      idCliente = clienteExistente.rows[0].id_cliente;
    } else {
      const nuevoCliente = await client.query(
        `INSERT INTO clientes (id_usuario, nombre_completo, telefono, direccion, estado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_cliente`,
        [idUsuario, 'Soto Cliente', '+573000000000', 'Sin dirección', 'activo']
      );
      idCliente = nuevoCliente.rows[0].id_cliente;
    }

    const tenderoRes = await client.query(
      'SELECT id_tendero FROM tenderos WHERE id_usuario != $1 ORDER BY id_tendero LIMIT 1',
      [idUsuario]
    );

    if (tenderoRes.rows.length === 0) {
      throw new Error('No hay otro tendero en la BD para vincular al cliente');
    }

    const idTendero = tenderoRes.rows[0].id_tendero;

    await client.query(
      `INSERT INTO tendero_cliente (id_tendero, id_cliente, estado)
       VALUES ($1, $2, 'activo')
       ON CONFLICT (id_tendero, id_cliente) DO UPDATE SET estado = 'activo'`,
      [idTendero, idCliente]
    );

    await client.query('COMMIT');

    console.log('✅ Cuenta corregida como cliente');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   id_usuario: ${idUsuario}`);
    console.log(`   id_cliente: ${idCliente}`);
    console.log(`   vinculado a tendero: ${idTendero}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSotoAsCliente().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

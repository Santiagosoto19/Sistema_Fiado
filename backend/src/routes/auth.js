const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const tenderoResult = await pool.query(
      'SELECT * FROM tenderos WHERE id_usuario = $1',
      [user.id_usuario]
    );

    const tendero = tenderoResult.rows[0] || null;

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol,
        id_tendero: tendero ? tendero.id_tendero : null
      },
      process.env.JWT_SECRET || 'fiadocheck_jwt_secret_2024_secure',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO sesiones (id_usuario, token_hash, expires_at, revocado) VALUES ($1, $2, $3, false)',
      [user.id_usuario, tokenHash, expiresAt]
    );

    res.json({
      token,
      usuario: {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol
      },
      tendero: tendero ? {
        id_tendero: tendero.id_tendero,
        nombre: tendero.nombre,
        nombre_tienda: tendero.nombre_tienda
      } : null
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', require('../middleware/auth'), async (req, res) => {
  try {
    const pool = require('../config/database');

    await pool.query(
      'UPDATE sesiones SET revoke = true WHERE token_hash = $1',
      [req.tokenHash]
    );

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/registerClientes
router.post('/registerClientes', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre_completo, email, telefono, cedula, direccion, password, id_rol } = req.body;

    // 1. Validaciones básicas
    if (!email || !password || !nombre_completo || !cedula) {
      return res.status(400).json({ error: 'Email, contraseña, nombre y cédula son requeridos' });
    }

    await client.query('BEGIN');

    // 2. Verificar si el email ya existe
    const existeEmail = await client.query('SELECT id_usuario FROM usuario WHERE email = $1', [email]);
    if (existeEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 3. Verificar si la cédula ya existe como id_cliente
    const existeCedula = await client.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [cedula]);
    if (existeCedula.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }

    // 4. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Crear el usuario (id_rol 2 = cliente)
    const userResult = await client.query(
      'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [email, hashedPassword, id_rol || 2, 'activo']
    );
    const idUsuario = userResult.rows[0].id_usuario;

    // 6. Crear el registro en clientes usando la cédula como id_cliente
    await client.query(
      'INSERT INTO clientes (id_cliente, id_usuario, nombre_completo, telefono, direccion, estado) VALUES ($1, $2, $3, $4, $5, $6)',
      [cedula, idUsuario, nombre_completo, telefono, direccion, 'activo']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuario registrado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});


// POST /api/auth/registerTendero
router.post('/registerTendero', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre_completo, email, telefono, cedula, direccion, num_camara_comercio, password, id_rol } = req.body;

    // 1. Validaciones de campos requeridos
    const missing = [];
    if (!nombre_completo || !nombre_completo.trim()) missing.push('nombre completo');
    if (!email || !email.trim()) missing.push('email');
    if (!telefono || !telefono.trim()) missing.push('teléfono');
    if (!cedula || !cedula.trim()) missing.push('cédula');
    if (!direccion || !direccion.trim()) missing.push('dirección');
    if (!num_camara_comercio || !num_camara_comercio.trim()) missing.push('número de cámara de comercio');
    if (!password) missing.push('contraseña');

    if (missing.length > 0) {
      return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
    }

    // 2. Validaciones de formato
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (cedula.trim().length < 7) {
      return res.status(400).json({ error: 'La cédula debe tener al menos 7 caracteres' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    await client.query('BEGIN');

    // 3. Verificar si el email ya existe
    const existeEmail = await client.query('SELECT id_usuario FROM usuario WHERE email = $1', [email.trim()]);
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 4. Verificar si la cédula (id_tendero) ya existe
    const existeCedula = await client.query('SELECT id_tendero FROM tenderos WHERE id_tendero = $1', [cedula.trim()]);
    if (existeCedula.rows.length > 0) {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }

    // 5. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Crear el usuario (id_rol 1 para tenderos)
    const userResult = await client.query(
      'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [email.trim(), hashedPassword, id_rol || 1, 'activo']
    );
    const idUsuario = userResult.rows[0].id_usuario;

    // 7. Crear el registro en la tabla tenderos (id_tendero = cedula)
    await client.query(
      'INSERT INTO tenderos (id_tendero, id_usuario, nombre, nombre_tienda, telefono, direccion, num_camara_comercio, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [cedula.trim(), idUsuario, nombre_completo.trim(), nombre_completo.trim(), telefono.trim(), direccion.trim(), num_camara_comercio.trim(), true]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Tendero registrado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro de tendero:', err);

    // Manejar error de clave duplicada
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('id_tendero')) {
        return res.status(400).json({ error: 'La cédula ya está registrada' });
      }
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      return res.status(400).json({ error: 'El registro ya existe' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
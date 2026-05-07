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
    if (!email || !password || !nombre_completo) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    }

    await client.query('BEGIN');

    // 2. Verificar si el usuario ya existe
    const existe = await client.query('SELECT id_usuario FROM usuario WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 3. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Crear el usuario (id_rol 2 suele ser para clientes)
    const userResult = await client.query(
      'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [email, hashedPassword, id_rol || 2, 'activo']
    );
    const idUsuario = userResult.rows[0].id_usuario;

    // 5. Crear el registro en la tabla clientes
    await client.query(
      'INSERT INTO clientes (id_usuario, nombre_completo, telefono, direccion) VALUES ($1, $2, $3, $4)',
      [idUsuario, nombre_completo, telefono, direccion]
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


module.exports = router;
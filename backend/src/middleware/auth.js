const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fiadocheck_jwt_secret_2024_secure');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT * FROM sesiones WHERE token_hash = $1 AND revocado = false AND expires_at > NOW()',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Token inválido o sesión expirada' });
    }

    req.user = decoded;
    req.tokenHash = tokenHash;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    console.error('Error verificando sesión:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = authMiddleware;
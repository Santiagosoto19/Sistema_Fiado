const { Pool } = require('pg');
require('dotenv').config();

// Prioritizamos la DATABASE_URL para Neon (Postgres Connection String)
const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString: connectionString,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'fiadocheck',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

module.exports = pool;

// backend/scripts/fixPassword.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

async function fixPassword() {
  const email       = 'soto@fiado.com'; // el email que tienes
  const newPassword = '123456';           // la contraseña que quieres

  const hash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    'UPDATE usuario SET password = $1 WHERE email = $2',
    [hash, email]
  );

  console.log('✅ Contraseña actualizada correctamente');
  process.exit(0);
}

fixPassword().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
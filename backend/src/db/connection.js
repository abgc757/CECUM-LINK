const { Pool } = require('pg');
const schema = require('./schema');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(schema);

    const { rows } = await client.query("SELECT id FROM users WHERE role='superuser' LIMIT 1");
    if (rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('Admin123!', 12);
      await client.query(
        `INSERT INTO users (username, full_name, email, password_hash, role, approved)
         VALUES ('superadmin', 'Super Administrador', 'admin@cecum.edu.mx', $1, 'superuser', true)`,
        [hash]
      );
      console.log('Superusuario creado: admin@cecum.edu.mx / Admin123!');
    }
    console.log('Base de datos inicializada');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };

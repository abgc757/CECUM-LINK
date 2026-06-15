const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { username, full_name, email, password, grade } = req.body;
  if (!username || !full_name || !email || !password)
    return res.status(400).json({ error: 'Campos requeridos faltantes' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, full_name, email, password_hash, role, grade, approved)
       VALUES ($1,$2,$3,$4,'student',$5,false) RETURNING id, username, full_name, email, role, approved`,
      [username, full_name, email, hash, grade]
    );
    res.status(201).json({ message: 'Registro exitoso. Espera aprobación del administrador.', user: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Usuario o email ya registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Credenciales inválidas' });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!user.approved && user.role !== 'superuser')
      return res.status(403).json({ error: 'Cuenta pendiente de aprobación' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, email: user.email, role: user.role, avatar_url: user.avatar_url, bio: user.bio, grade: user.grade } });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, full_name, email, role, avatar_url, bio, grade, approved, created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;

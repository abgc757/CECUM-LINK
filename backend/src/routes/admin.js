const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth, requireRole } = require('../middleware/auth');

const isMod = requireRole('moderator', 'superuser');
const isSuperuser = requireRole('superuser');

router.post('/users', auth, isMod, async (req, res) => {
  const { username, full_name, email, password, role, grade } = req.body;
  if (!username || !full_name || !email || !password)
    return res.status(400).json({ error: 'username, full_name, email y password son requeridos' });
  const validRoles = ['student','teacher','parent','moderator','superuser'];
  const assignedRole = validRoles.includes(role) ? role : 'student';
  if (assignedRole === 'superuser' && req.user.role !== 'superuser')
    return res.status(403).json({ error: 'Solo un superusuario puede crear otros superusuarios' });
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, full_name, email, password_hash, role, grade, approved)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       RETURNING id, username, full_name, email, role, grade, approved, created_at`,
      [username, full_name, email, hash, assignedRole, grade || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Usuario o email ya registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/users', auth, isMod, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, full_name, email, role, approved, grade, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
});

router.patch('/users/:id/approve', auth, isMod, async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE users SET approved=$1 WHERE id=$2 RETURNING id, username, approved',
    [req.body.approved, req.params.id]
  );
  res.json(rows[0]);
});

router.patch('/users/:id/role', auth, isSuperuser, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
  const { role } = req.body;
  const validRoles = ['student','teacher','parent','moderator','superuser'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  const { rows } = await pool.query(
    'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, role',
    [role, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/users/:id', auth, isSuperuser, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ deleted: true });
});

router.post('/sql', auth, isMod, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query requerida' });

  const forbidden = /^\s*(drop|truncate|delete\s+from\s+users|alter|create\s+user|grant|revoke)/i;
  if (forbidden.test(query))
    return res.status(403).json({ error: 'Operación no permitida por seguridad' });

  try {
    const result = await pool.query(query);
    res.json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(f => ({ name: f.name, dataTypeID: f.dataTypeID }))
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/stats', auth, isMod, async (req, res) => {
  const [users, posts, groups, events] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM posts'),
    pool.query('SELECT COUNT(*) FROM groups'),
    pool.query('SELECT COUNT(*) FROM events WHERE event_date >= NOW()')
  ]);
  res.json({
    total_users: parseInt(users.rows[0].count),
    total_posts: parseInt(posts.rows[0].count),
    total_groups: parseInt(groups.rows[0].count),
    upcoming_events: parseInt(events.rows[0].count)
  });
});

module.exports = router;

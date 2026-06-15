const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const { rows } = await pool.query(
    `SELECT id, username, full_name, avatar_url, role FROM users
     WHERE approved=true AND (username ILIKE $1 OR full_name ILIKE $1)
     LIMIT 10`,
    [`%${q}%`]
  );
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, full_name, avatar_url, bio, role, grade, created_at FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

router.patch('/me', auth, upload.single('avatar'), async (req, res) => {
  const { bio, full_name } = req.body;
  const updates = [];
  const params = [];
  let i = 1;
  if (full_name) { updates.push(`full_name=$${i++}`); params.push(full_name); }
  if (bio !== undefined) { updates.push(`bio=$${i++}`); params.push(bio); }
  if (req.file) { updates.push(`avatar_url=$${i++}`); params.push(`/uploads/${req.file.filename}`); }
  if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });
  params.push(req.user.id);
  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(',')} WHERE id=$${i} RETURNING id, username, full_name, avatar_url, bio, role`,
    params
  );
  res.json(rows[0]);
});

module.exports = router;

const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');
const { upload, getImageUrl } = require('../upload');

router.get('/', auth, async (req, res) => {
  const { group_id } = req.query;
  let q = `SELECT g.*, u.username, u.full_name FROM gallery g JOIN users u ON u.id=g.user_id`;
  const params = [];
  if (group_id) { q += ` WHERE g.group_id=$1`; params.push(group_id); }
  q += ` ORDER BY g.created_at DESC LIMIT 60`;
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });
  const { caption, group_id } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO gallery (user_id, group_id, image_url, caption) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.user.id, group_id || null, await getImageUrl(req.file), caption]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT user_id FROM gallery WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const canDelete = rows[0].user_id === req.user.id || ['moderator','superuser'].includes(req.user.role);
  if (!canDelete) return res.status(403).json({ error: 'Sin permisos' });
  await pool.query('DELETE FROM gallery WHERE id=$1', [req.params.id]);
  res.json({ deleted: true });
});

module.exports = router;

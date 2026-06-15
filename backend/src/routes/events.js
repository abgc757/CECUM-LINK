const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT e.*, u.full_name AS creator_name, g.name AS group_name
    FROM events e
    JOIN users u ON u.id=e.created_by
    LEFT JOIN groups g ON g.id=e.group_id
    ORDER BY e.event_date ASC
  `);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { title, description, event_date, location, group_id } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Título y fecha requeridos' });
  const { rows } = await pool.query(
    `INSERT INTO events (title, description, event_date, location, group_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, description, event_date, location, group_id || null, req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT created_by FROM events WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const canDelete = rows[0].created_by === req.user.id || ['moderator','superuser'].includes(req.user.role);
  if (!canDelete) return res.status(403).json({ error: 'Sin permisos' });
  await pool.query('DELETE FROM events WHERE id=$1', [req.params.id]);
  res.json({ deleted: true });
});

module.exports = router;

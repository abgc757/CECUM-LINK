const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT g.*, u.full_name AS creator_name,
      COUNT(DISTINCT gm.user_id) AS members_count,
      EXISTS(SELECT 1 FROM group_members WHERE group_id=g.id AND user_id=$1) AS is_member
    FROM groups g
    JOIN users u ON u.id=g.created_by
    LEFT JOIN group_members gm ON gm.group_id=g.id
    GROUP BY g.id, u.full_name ORDER BY g.created_at DESC
  `, [req.user.id]);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { name, description, subject, grade } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const { rows } = await pool.query(
    `INSERT INTO groups (name, description, subject, grade, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, description, subject, grade, req.user.id]
  );
  await pool.query(
    'INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,$3)',
    [rows[0].id, req.user.id, 'admin']
  );
  res.status(201).json(rows[0]);
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,$3)',
      [req.params.id, req.user.id, 'member']
    );
    res.json({ joined: true });
  } catch {
    res.status(400).json({ error: 'Ya eres miembro' });
  }
});

router.delete('/:id/leave', auth, async (req, res) => {
  await pool.query('DELETE FROM group_members WHERE group_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ left: true });
});

router.get('/:id/members', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.full_name, u.avatar_url, u.role, gm.role AS group_role
    FROM group_members gm JOIN users u ON u.id=gm.user_id
    WHERE gm.group_id=$1 ORDER BY u.full_name
  `, [req.params.id]);
  res.json(rows);
});

module.exports = router;

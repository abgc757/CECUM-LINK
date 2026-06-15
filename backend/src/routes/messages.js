const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');

router.get('/conversations', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (other_id)
      other_id,
      u.username, u.full_name, u.avatar_url,
      last_msg, last_time,
      unread_count
    FROM (
      SELECT
        CASE WHEN sender_id=$1 THEN receiver_id ELSE sender_id END AS other_id,
        content AS last_msg,
        created_at AS last_time,
        SUM(CASE WHEN receiver_id=$1 AND NOT read THEN 1 ELSE 0 END) OVER (
          PARTITION BY CASE WHEN sender_id=$1 THEN receiver_id ELSE sender_id END
        ) AS unread_count
      FROM messages
      WHERE sender_id=$1 OR receiver_id=$1
    ) sub
    JOIN users u ON u.id=sub.other_id
    ORDER BY other_id, last_time DESC
  `, [req.user.id]);
  res.json(rows);
});

router.get('/:userId', auth, async (req, res) => {
  await pool.query(
    'UPDATE messages SET read=true WHERE sender_id=$1 AND receiver_id=$2',
    [req.params.userId, req.user.id]
  );
  const { rows } = await pool.query(
    `SELECT m.*, u.username, u.full_name, u.avatar_url FROM messages m
     JOIN users u ON u.id=m.sender_id
     WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
     ORDER BY m.created_at ASC`,
    [req.user.id, req.params.userId]
  );
  res.json(rows);
});

router.post('/:userId', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Mensaje vacío' });
  const { rows } = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3)
     RETURNING *`,
    [req.user.id, req.params.userId, content]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;

const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');
const { upload, getImageUrl, getVideoUrl } = require('../upload');

// Galería de media: posts con imagen o video de un usuario
router.get('/media', auth, async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id requerido' });
  const { rows } = await pool.query(
    `SELECT p.id, p.image_url, p.video_url, p.content, p.created_at,
            u.full_name, u.username, u.avatar_url
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1 AND (p.image_url IS NOT NULL OR p.video_url IS NOT NULL)
     ORDER BY p.created_at DESC LIMIT 120`,
    [user_id]
  );
  res.json(rows);
});


router.get('/', auth, async (req, res) => {
  const { group_id, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;
  let q = `
    SELECT p.*, u.username, u.full_name, u.avatar_url,
      COUNT(DISTINCT pl.user_id) AS likes_count,
      COUNT(DISTINCT c.id) AS comments_count,
      EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=$1) AS liked
    FROM posts p
    JOIN users u ON u.id=p.user_id
    LEFT JOIN post_likes pl ON pl.post_id=p.id
    LEFT JOIN comments c ON c.post_id=p.id
  `;
  const params = [req.user.id];
  if (group_id) { q += ` WHERE p.group_id=$2 AND p.archived=false`; params.push(group_id); }
  else { q += ` WHERE p.group_id IS NULL AND p.archived=false`; }
  q += ` GROUP BY p.id, u.id ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

router.post('/', auth, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const { content, group_id } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });
  const image_url = getImageUrl(req.files?.image?.[0]);
  const video_url = getVideoUrl(req.files?.video?.[0]);
  const { rows } = await pool.query(
    `INSERT INTO posts (user_id, content, image_url, video_url, group_id) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, content, image_url, video_url, group_id, created_at`,
    [req.user.id, content, image_url, video_url, group_id || null]
  );
  res.status(201).json(rows[0]);
});

router.post('/:id/like', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)', [id, req.user.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, content, reference_id, reference_type)
       SELECT user_id, 'like', $1, $2, 'post' FROM posts WHERE id=$2 AND user_id != $3`,
      [`${req.user.full_name} le dio me gusta a tu publicación`, id, req.user.id]
    );
    res.json({ liked: true });
  } catch {
    await pool.query('DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2', [id, req.user.id]);
    res.json({ liked: false });
  }
});

router.get('/:id/comments', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, u.username, u.full_name, u.avatar_url FROM comments c
     JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC`,
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/comments', auth, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });
  const { rows } = await pool.query(
    `INSERT INTO comments (post_id, user_id, content) VALUES ($1,$2,$3)
     RETURNING id, content, created_at`,
    [req.params.id, req.user.id, content]
  );
  await pool.query(
    `INSERT INTO notifications (user_id, type, content, reference_id, reference_type)
     SELECT user_id, 'comment', $1, $2, 'post' FROM posts WHERE id=$2 AND user_id != $3`,
    [`${req.user.full_name} comentó en tu publicación`, req.params.id, req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id/archive', auth, async (req, res) => {
  const CAN_ARCHIVE = ['moderator', 'teacher', 'superuser'];
  if (!CAN_ARCHIVE.includes(req.user.role))
    return res.status(403).json({ error: 'Sin permisos para archivar' });
  const { rows } = await pool.query('SELECT id FROM posts WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const archived = req.body.archived ?? true;
  const { rows: updated } = await pool.query(
    'UPDATE posts SET archived=$1 WHERE id=$2 RETURNING id, archived',
    [archived, req.params.id]
  );
  res.json(updated[0]);
});

router.delete('/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT user_id FROM posts WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
  const canDelete = rows[0].user_id === req.user.id || ['moderator','superuser'].includes(req.user.role);
  if (!canDelete) return res.status(403).json({ error: 'Sin permisos' });
  await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
  res.json({ deleted: true });
});

module.exports = router;

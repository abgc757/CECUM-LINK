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
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/group/:groupId', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, u.full_name AS creator_name,
      ts.id AS my_submission_id, ts.grade AS my_grade, ts.submitted_at AS my_submitted_at
    FROM tasks t
    JOIN users u ON u.id=t.created_by
    LEFT JOIN task_submissions ts ON ts.task_id=t.id AND ts.user_id=$1
    WHERE t.group_id=$2 ORDER BY t.due_date ASC
  `, [req.user.id, req.params.groupId]);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { title, description, due_date, group_id } = req.body;
  if (!title || !group_id) return res.status(400).json({ error: 'Título y grupo requeridos' });
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, due_date, group_id, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [title, description, due_date || null, group_id, req.user.id]
  );
  res.status(201).json(rows[0]);
});

router.post('/:id/submit', auth, upload.single('file'), async (req, res) => {
  const { content } = req.body;
  const file_url = req.file ? `/uploads/${req.file.filename}` : null;
  const { rows } = await pool.query(
    `INSERT INTO task_submissions (task_id, user_id, content, file_url)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (task_id, user_id) DO UPDATE SET content=EXCLUDED.content, file_url=EXCLUDED.file_url, submitted_at=NOW()
     RETURNING *`,
    [req.params.id, req.user.id, content || null, file_url]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id/submissions', auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ts.*, u.full_name, u.username, u.avatar_url
    FROM task_submissions ts JOIN users u ON u.id=ts.user_id
    WHERE ts.task_id=$1 ORDER BY ts.submitted_at DESC
  `, [req.params.id]);
  res.json(rows);
});

router.patch('/submissions/:id/grade', auth, async (req, res) => {
  const { grade, feedback } = req.body;
  const { rows } = await pool.query(
    'UPDATE task_submissions SET grade=$1, feedback=$2 WHERE id=$3 RETURNING *',
    [grade, feedback, req.params.id]
  );
  res.json(rows[0]);
});

module.exports = router;

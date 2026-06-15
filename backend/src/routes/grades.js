const router = require('express').Router();
const { pool } = require('../db/connection');
const { auth } = require('../middleware/auth');

router.get('/my', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, u.full_name AS teacher_name FROM grades g
     JOIN users u ON u.id=g.created_by WHERE g.student_id=$1 ORDER BY g.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

router.get('/student/:studentId', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT g.*, u.full_name AS teacher_name FROM grades g
     JOIN users u ON u.id=g.created_by WHERE g.student_id=$1 ORDER BY g.created_at DESC`,
    [req.params.studentId]
  );
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { student_id, subject, grade_value, period, notes } = req.body;
  if (!student_id || !subject || grade_value == null)
    return res.status(400).json({ error: 'student_id, subject y grade_value requeridos' });
  const { rows } = await pool.query(
    `INSERT INTO grades (student_id, subject, grade_value, period, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [student_id, subject, grade_value, period, notes, req.user.id]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;

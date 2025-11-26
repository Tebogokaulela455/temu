const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const adminOnly = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.email !== 'tebogoanthony455@gmail.com') {
      return res.status(403).json({ error: "Admin access only" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get pending users
router.get('/users', adminOnly, async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, email, status, approved_until FROM users WHERE role = 'user'");
  res.json(rows);
});

// Approve user (1 month access)
router.post('/approve/:id', adminOnly, async (req, res) => {
  const userId = req.params.id;
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await pool.query(
    "UPDATE users SET status = 'approved', approved_until = ? WHERE id = ?",
    [nextMonth.toISOString().split('T')[0], userId]
  );
  res.json({ success: true });
});

// Renew all users (run monthly)
router.post('/renew-all', adminOnly, async (req, res) => {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await pool.query(
    "UPDATE users SET status = 'approved', approved_until = ? WHERE role = 'user'",
    [nextMonth.toISOString().split('T')[0]]
  );
  res.json({ success: true, message: "All users renewed for 30 days" });
});

module.exports = router;
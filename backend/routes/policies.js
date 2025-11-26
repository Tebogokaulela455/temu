const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Generate Policy Number
const generatePolicyNumber = async () => {
  const year = new Date().getFullYear();
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM policies WHERE YEAR(created_at) = ?", [year]);
  const count = rows[0].count + 1;
  return `LP-${year}-${String(count).padStart(5, '0')}`;
};

// Add Policy
router.post('/add', authMiddleware, async (req, res) => {
  const { client_name, client_id_number, premium, cover_amount, start_date } = req.body;
  const policy_number = await generatePolicyNumber();

  try {
    await pool.query(
      "INSERT INTO policies (policy_number, client_name, client_id_number, premium, cover_amount, start_date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [policy_number, client_name, client_id_number, premium, cover_amount, start_date, req.user.id]
    );
    res.json({ success: true, policy_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Policies
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM policies WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
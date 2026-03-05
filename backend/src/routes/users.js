const express = require('express');
const { body } = require('express-validator');
const { getDb } = require('../database');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY name').all();
    res.json({ users });
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().normalizeEmail().withMessage('A valid email address is required'),
  ],
  validate,
  (req, res) => {
    try {
      const db = getDb();
      const { name, email } = req.body;

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }

      const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ message: 'User created successfully', user });
    } catch (err) {
      console.error('POST /users error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;

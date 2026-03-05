const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../database');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

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
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  handleValidationErrors,
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

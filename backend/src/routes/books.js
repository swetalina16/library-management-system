const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { getDb } = require('../database');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// GET /api/books — list books with optional filtering and pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('genre').optional().isString().trim(),
    query('search').optional().isString().trim(),
    query('available').optional().isBoolean().toBoolean(),
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const db = getDb();
      const page = req.query.page || 1;
      const limit = req.query.limit || 12;
      const offset = (page - 1) * limit;
      const { genre, search, available } = req.query;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (genre) {
        whereClause += ' AND b.genre = ?';
        params.push(genre);
      }
      if (search) {
        whereClause += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      if (available === true) {
        whereClause += ' AND b.available_copies > 0';
      }

      const countStmt = db.prepare(`SELECT COUNT(*) as total FROM books b ${whereClause}`);
      const { total } = countStmt.get(...params);

      const booksStmt = db.prepare(
        `SELECT b.*, 
          CASE WHEN b.available_copies > 0 THEN 1 ELSE 0 END as is_available
         FROM books b 
         ${whereClause}
         ORDER BY b.title ASC
         LIMIT ? OFFSET ?`
      );
      const books = booksStmt.all(...params, limit, offset);

      res.json({
        books,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('GET /books error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/books/genres — list all distinct genres
router.get('/genres', (req, res) => {
  try {
    const db = getDb();
    const genres = db.prepare('SELECT DISTINCT genre FROM books ORDER BY genre').all();
    res.json(genres.map((g) => g.genre));
  } catch (err) {
    console.error('GET /books/genres error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/books/:id — get a single book
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).toInt()],
  handleValidationErrors,
  (req, res) => {
    try {
      const db = getDb();
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }
      res.json(book);
    } catch (err) {
      console.error('GET /books/:id error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;

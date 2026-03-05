const express = require('express');
const { query, param } = require('express-validator');
const { getDb } = require('../database');
const { getAIRecommendations } = require('../services/aiRecommendations');
const validate = require('../middleware/validate');

const router = express.Router();

// Whitelist of allowed sort values → safe SQL expressions
// Never interpolate user input directly into SQL — always use this map
const SORT_OPTIONS = {
  title:         'b.title ASC',
  author:        'b.author ASC',
  status:        'b.available_copies DESC, b.title ASC',
  published_year:'b.published_year DESC, b.title ASC',
};
const DEFAULT_SORT = SORT_OPTIONS.title;

// GET /api/books — list books with optional filtering, sorting, and pagination
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('genre').optional().isString().trim(),
    query('search').optional().isString().trim(),
    query('available').optional().isBoolean().toBoolean(),
    query('sort').optional().isIn(Object.keys(SORT_OPTIONS)),
  ],
  validate,
  (req, res) => {
    try {
      const db = getDb();
      const page = req.query.page || 1;
      const limit = req.query.limit || 12;
      const offset = (page - 1) * limit;
      const { genre, search, available, sort } = req.query;

      // Look up the safe ORDER BY expression from the whitelist
      const orderBy = SORT_OPTIONS[sort] || DEFAULT_SORT;

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
         ORDER BY ${orderBy}
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

// GET /api/books/:id/recommendations — AI-powered "you might also like" suggestions
router.get(
  '/:id/recommendations',
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const db = getDb();

      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      // Prefer same-genre books, then fill with others — keep the list small for the AI
      const candidates = db
        .prepare(
          `SELECT * FROM books
           WHERE id != ?
           ORDER BY CASE WHEN genre = ? THEN 0 ELSE 1 END, title ASC
           LIMIT 20`
        )
        .all(book.id, book.genre);

      const recommendations = await getAIRecommendations(book, candidates);
      res.json({ recommendations });
    } catch (err) {
      console.error('GET /books/:id/recommendations error:', err);
      res.status(500).json({ error: 'Could not fetch recommendations' });
    }
  }
);

// GET /api/books/:id — get a single book
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
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

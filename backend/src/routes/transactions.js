const express = require('express');
const { body, query } = require('express-validator');
const { getDb } = require('../database');
const validate = require('../middleware/validate');

const router = express.Router();

const LOAN_PERIOD_DAYS = 14;

// POST /api/checkout/batch — check out multiple books for one user in one go
router.post(
  '/checkout/batch',
  [
    body('book_ids')
      .isArray({ min: 1 })
      .withMessage('book_ids must be a non-empty array'),
    body('book_ids.*')
      .isInt({ min: 1 })
      .toInt()
      .withMessage('Each book_id must be a positive integer'),
    body('user_id')
      .isInt({ min: 1 })
      .toInt()
      .withMessage('user_id is required and must be a positive integer'),
  ],
  validate,
  (req, res) => {
    const db = getDb();
    const { book_ids, user_id } = req.body;

    const batchCheckout = db.transaction(() => {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
      if (!user) return { status: 404, body: { error: 'User not found' } };

      const results = book_ids.map((book_id) => {
        const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
        if (!book) {
          return { book_id, success: false, error: 'Book not found' };
        }
        if (book.available_copies < 1) {
          return { book_id, book_title: book.title, success: false, error: 'No copies available' };
        }
        const alreadyOut = db
          .prepare(`SELECT id FROM transactions WHERE book_id = ? AND user_id = ? AND status = 'active'`)
          .get(book_id, user_id);
        if (alreadyOut) {
          return { book_id, book_title: book.title, success: false, error: 'Already checked out by this user' };
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

        const insert = db
          .prepare(`INSERT INTO transactions (book_id, user_id, due_date, status) VALUES (?, ?, ?, 'active')`)
          .run(book_id, user_id, dueDate.toISOString());

        db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

        const transaction = db
          .prepare(
            `SELECT t.*, b.title as book_title, u.name as user_name
             FROM transactions t
             JOIN books b ON t.book_id = b.id
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`
          )
          .get(insert.lastInsertRowid);

        return { book_id, book_title: book.title, success: true, transaction };
      });

      return { status: 200, body: { results, user_name: user.name } };
    });

    try {
      const outcome = batchCheckout();
      res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('POST /checkout/batch error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/checkout — check out a book
router.post(
  '/checkout',
  [
    body('book_id').isInt({ min: 1 }).toInt().withMessage('book_id is required and must be a positive integer'),
    body('user_id').isInt({ min: 1 }).toInt().withMessage('user_id is required and must be a positive integer'),
  ],
  validate,
  (req, res) => {
    const db = getDb();
    const { book_id, user_id } = req.body;

    const checkout = db.transaction(() => {
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
      if (!book) {
        return { status: 404, body: { error: 'Book not found' } };
      }
      if (book.available_copies < 1) {
        return { status: 409, body: { error: 'No copies available for checkout' } };
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
      if (!user) {
        return { status: 404, body: { error: 'User not found' } };
      }

      const existingCheckout = db
        .prepare(
          `SELECT id FROM transactions
           WHERE book_id = ? AND user_id = ? AND status = 'active'`
        )
        .get(book_id, user_id);
      if (existingCheckout) {
        return { status: 409, body: { error: 'User already has this book checked out' } };
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);

      const result = db
        .prepare(
          `INSERT INTO transactions (book_id, user_id, due_date, status)
           VALUES (?, ?, ?, 'active')`
        )
        .run(book_id, user_id, dueDate.toISOString());

      db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);

      const transaction = db
        .prepare(
          `SELECT t.*, b.title as book_title, u.name as user_name, u.email as user_email
           FROM transactions t
           JOIN books b ON t.book_id = b.id
           JOIN users u ON t.user_id = u.id
           WHERE t.id = ?`
        )
        .get(result.lastInsertRowid);

      return { status: 201, body: { message: 'Book checked out successfully', transaction } };
    });

    try {
      const result = checkout();
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error('POST /checkout error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/return/batch — return multiple books in one go
router.post(
  '/return/batch',
  [
    body('transaction_ids')
      .isArray({ min: 1 })
      .withMessage('transaction_ids must be a non-empty array'),
    body('transaction_ids.*')
      .isInt({ min: 1 })
      .toInt()
      .withMessage('Each transaction_id must be a positive integer'),
  ],
  validate,
  (req, res) => {
    const db = getDb();
    const { transaction_ids } = req.body;

    const batchReturn = db.transaction(() => {
      const returnDate = new Date().toISOString();

      const results = transaction_ids.map((transaction_id) => {
        const tx = db
          .prepare(
            `SELECT t.*, b.title as book_title, u.name as user_name
             FROM transactions t
             JOIN books b ON t.book_id = b.id
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`
          )
          .get(transaction_id);

        if (!tx) {
          return { transaction_id, success: false, error: 'Transaction not found' };
        }
        if (tx.status === 'returned') {
          return { transaction_id, book_title: tx.book_title, user_name: tx.user_name, success: false, error: 'Already returned' };
        }

        db.prepare(`UPDATE transactions SET status = 'returned', return_date = ? WHERE id = ?`)
          .run(returnDate, transaction_id);
        db.prepare(`UPDATE books SET available_copies = available_copies + 1 WHERE id = ?`)
          .run(tx.book_id);

        const updated = db
          .prepare(
            `SELECT t.*, b.title as book_title, u.name as user_name, u.email as user_email
             FROM transactions t
             JOIN books b ON t.book_id = b.id
             JOIN users u ON t.user_id = u.id
             WHERE t.id = ?`
          )
          .get(transaction_id);

        return { transaction_id, book_title: tx.book_title, user_name: tx.user_name, success: true, transaction: updated };
      });

      return { status: 200, body: { results } };
    });

    try {
      const outcome = batchReturn();
      res.status(outcome.status).json(outcome.body);
    } catch (err) {
      console.error('POST /return/batch error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/return — return a book
router.post(
  '/return',
  [
    body('transaction_id').isInt({ min: 1 }).toInt().withMessage('transaction_id is required and must be a positive integer'),
  ],
  validate,
  (req, res) => {
    const db = getDb();
    const { transaction_id } = req.body;

    const returnBook = db.transaction(() => {
      const transaction = db
        .prepare(
          `SELECT t.*, b.title as book_title, u.name as user_name
           FROM transactions t
           JOIN books b ON t.book_id = b.id
           JOIN users u ON t.user_id = u.id
           WHERE t.id = ?`
        )
        .get(transaction_id);

      if (!transaction) {
        return { status: 404, body: { error: 'Transaction not found' } };
      }
      if (transaction.status === 'returned') {
        return { status: 409, body: { error: 'Book has already been returned' } };
      }

      const returnDate = new Date().toISOString();
      db.prepare(
        `UPDATE transactions SET status = 'returned', return_date = ? WHERE id = ?`
      ).run(returnDate, transaction_id);

      db.prepare(
        'UPDATE books SET available_copies = available_copies + 1 WHERE id = ?'
      ).run(transaction.book_id);

      const updated = db
        .prepare(
          `SELECT t.*, b.title as book_title, u.name as user_name, u.email as user_email
           FROM transactions t
           JOIN books b ON t.book_id = b.id
           JOIN users u ON t.user_id = u.id
           WHERE t.id = ?`
        )
        .get(transaction_id);

      return { status: 200, body: { message: 'Book returned successfully', transaction: updated } };
    });

    try {
      const result = returnBook();
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error('POST /return error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/transactions — list transactions with optional filters
router.get(
  '/transactions',
  [
    query('user_id').optional().isInt({ min: 1 }).toInt().withMessage('user_id must be a positive integer'),
    query('status').optional().isIn(['active', 'returned', 'overdue']).withMessage('status must be active, returned, or overdue'),
  ],
  validate,
  (req, res) => {
  try {
    const db = getDb();
    const { user_id, status } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (user_id) {
      whereClause += ' AND t.user_id = ?';
      params.push(user_id);
    }
    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const transactions = db
      .prepare(
        `SELECT t.*, b.title as book_title, b.author as book_author,
                u.name as user_name, u.email as user_email
         FROM transactions t
         JOIN books b ON t.book_id = b.id
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.checkout_date DESC`
      )
      .all(...params);

    res.json({ transactions });
  } catch (err) {
    console.error('GET /transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
  }
);

module.exports = router;

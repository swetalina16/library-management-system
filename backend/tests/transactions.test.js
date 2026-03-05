const request = require('supertest');
const app = require('../src/app');
const { initializeSchema } = require('../src/database');

jest.mock('../src/database', () => {
  const Database = require('better-sqlite3');
  const { initializeSchema } = jest.requireActual('../src/database');
  let db;
  return {
    getDb: () => {
      if (!db) {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initializeSchema(db);
        db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Alice', 'alice@test.com');
        db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Bob', 'bob@test.com');
        db.prepare(
          `INSERT INTO books (title, author, isbn, genre, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run('Available Book', 'Author One', 'ISBN001', 'Fiction', 2, 2);
        db.prepare(
          `INSERT INTO books (title, author, isbn, genre, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run('Unavailable Book', 'Author Two', 'ISBN002', 'Drama', 1, 0);
      }
      return db;
    },
    closeDb: () => { if (db) { db.close(); db = null; } },
    initializeSchema,
  };
});

describe('POST /api/checkout', () => {
  it('successfully checks out an available book', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 1, user_id: 1 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Book checked out successfully');
    expect(res.body.transaction).toHaveProperty('status', 'active');
    expect(res.body.transaction).toHaveProperty('due_date');
    expect(res.body.transaction).toHaveProperty('book_title', 'Available Book');
    expect(res.body.transaction).toHaveProperty('user_name', 'Alice');
  });

  it('decrements available_copies after checkout', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body.available_copies).toBe(1);
  });

  it('returns 409 when no copies are available', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 2, user_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/No copies available/i);
  });

  it('returns 409 if user already has this book checked out', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 1, user_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already has this book/i);
  });

  it('returns 404 for non-existent book', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 9999, user_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Book not found/i);
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 1, user_id: 9999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/User not found/i);
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/checkout').send({ book_id: 1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid field types', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .send({ book_id: 'abc', user_id: 1 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/return', () => {
  it('successfully returns a checked-out book', async () => {
    const res = await request(app)
      .post('/api/return')
      .send({ transaction_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Book returned successfully');
    expect(res.body.transaction).toHaveProperty('status', 'returned');
    expect(res.body.transaction).toHaveProperty('return_date');
  });

  it('increments available_copies after return', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body.available_copies).toBe(2);
  });

  it('returns 409 when book was already returned', async () => {
    const res = await request(app)
      .post('/api/return')
      .send({ transaction_id: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already been returned/i);
  });

  it('returns 404 for non-existent transaction', async () => {
    const res = await request(app)
      .post('/api/return')
      .send({ transaction_id: 99999 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Transaction not found/i);
  });

  it('returns 400 for missing transaction_id', async () => {
    const res = await request(app).post('/api/return').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/transactions', () => {
  it('returns a list of transactions', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(Array.isArray(res.body.transactions)).toBe(true);
  });

  it('filters by user_id', async () => {
    const res = await request(app).get('/api/transactions?user_id=1');
    expect(res.status).toBe(200);
    res.body.transactions.forEach((t) => {
      expect(t.user_id).toBe(1);
    });
  });

  it('filters by status', async () => {
    const res = await request(app).get('/api/transactions?status=returned');
    expect(res.status).toBe(200);
    res.body.transactions.forEach((t) => {
      expect(t.status).toBe('returned');
    });
  });
});

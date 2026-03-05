const request = require('supertest');
const Database = require('better-sqlite3');
const app = require('../src/app');
const { initializeSchema } = require('../src/database');

// Patch getDb to use a shared in-memory database per test file
let testDb;
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
        // Seed test data
        db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Test User', 'test@example.com');
        db.prepare(
          `INSERT INTO books (title, author, isbn, genre, published_year, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run('Test Book', 'Test Author', '1234567890', 'Fiction', 2020, 3, 3);
        db.prepare(
          `INSERT INTO books (title, author, isbn, genre, published_year, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run('No Copies Book', 'Another Author', '0987654321', 'Fantasy', 2021, 1, 0);
      }
      return db;
    },
    closeDb: () => { if (db) { db.close(); db = null; } },
    initializeSchema,
  };
});

describe('GET /api/books', () => {
  it('returns a list of books with pagination', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('books');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.books)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
  });

  it('filters by genre', async () => {
    const res = await request(app).get('/api/books?genre=Fiction');
    expect(res.status).toBe(200);
    res.body.books.forEach((book) => {
      expect(book.genre).toBe('Fiction');
    });
  });

  it('filters by search term', async () => {
    const res = await request(app).get('/api/books?search=Test');
    expect(res.status).toBe(200);
    expect(res.body.books.length).toBeGreaterThan(0);
    expect(res.body.books[0].title).toContain('Test');
  });

  it('filters only available books', async () => {
    const res = await request(app).get('/api/books?available=true');
    expect(res.status).toBe(200);
    res.body.books.forEach((book) => {
      expect(book.available_copies).toBeGreaterThan(0);
    });
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/api/books?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.books.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /api/books/:id', () => {
  it('returns a book by id', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('title');
  });

  it('returns 404 for non-existent book', async () => {
    const res = await request(app).get('/api/books/99999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/api/books/abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/books/genres', () => {
  it('returns an array of genre strings', async () => {
    const res = await request(app).get('/api/books/genres');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Fiction');
  });
});

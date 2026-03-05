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
        db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Existing User', 'existing@test.com');
      }
      return db;
    },
    closeDb: () => { if (db) { db.close(); db = null; } },
    initializeSchema,
  };
});

describe('GET /api/users', () => {
  it('returns a list of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it('does not expose passwords or sensitive fields', async () => {
    const res = await request(app).get('/api/users');
    res.body.users.forEach((user) => {
      expect(user).not.toHaveProperty('password');
    });
  });
});

describe('POST /api/users', () => {
  it('creates a new user successfully', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'New User', email: 'newuser@test.com' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'User created successfully');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('name', 'New User');
    expect(res.body.user.email).toBeTruthy();
  });

  it('returns 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Duplicate', email: 'existing@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'valid@test.com' });
    expect(res.status).toBe(400);
  });
});

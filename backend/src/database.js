const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '..', 'data', 'library.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    if (process.env.NODE_ENV !== 'test') {
      seedData(db);
    }
  }
  return db;
}

function initializeSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      genre TEXT NOT NULL,
      published_year INTEGER,
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      CHECK (available_copies >= 0),
      CHECK (available_copies <= total_copies)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      checkout_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      return_date DATETIME,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'returned', 'overdue')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions(book_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_books_available ON books(available_copies);
  `);
}

function seedData(database) {
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  const insertUser = database.prepare(
    'INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)'
  );
  const insertBook = database.prepare(
    `INSERT OR IGNORE INTO books (title, author, isbn, genre, published_year, total_copies, available_copies)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const seedUsers = database.transaction(() => {
    insertUser.run('Alice Johnson', 'alice@example.com');
    insertUser.run('Bob Smith', 'bob@example.com');
    insertUser.run('Carol White', 'carol@example.com');
    insertUser.run('David Brown', 'david@example.com');
    insertUser.run('Eve Davis', 'eve@example.com');
  });

  const seedBooks = database.transaction(() => {
    insertBook.run('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565', 'Fiction', 1925, 3, 3);
    insertBook.run('To Kill a Mockingbird', 'Harper Lee', '9780061935466', 'Fiction', 1960, 2, 2);
    insertBook.run('1984', 'George Orwell', '9780451524935', 'Dystopian', 1949, 4, 4);
    insertBook.run('Pride and Prejudice', 'Jane Austen', '9780141439518', 'Romance', 1813, 2, 2);
    insertBook.run('The Catcher in the Rye', 'J.D. Salinger', '9780316769174', 'Fiction', 1951, 3, 3);
    insertBook.run('Brave New World', 'Aldous Huxley', '9780060850524', 'Dystopian', 1932, 2, 2);
    insertBook.run('The Hobbit', 'J.R.R. Tolkien', '9780547928227', 'Fantasy', 1937, 3, 3);
    insertBook.run('Harry Potter and the Sorcerer\'s Stone', 'J.K. Rowling', '9780590353427', 'Fantasy', 1997, 5, 5);
    insertBook.run('The Alchemist', 'Paulo Coelho', '9780062315007', 'Fiction', 1988, 3, 3);
    insertBook.run('Sapiens', 'Yuval Noah Harari', '9780062316097', 'Non-Fiction', 2011, 2, 2);
    insertBook.run('Clean Code', 'Robert C. Martin', '9780132350884', 'Technology', 2008, 2, 2);
    insertBook.run('The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 'Technology', 1999, 2, 2);
  });

  seedUsers();
  seedBooks();
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, initializeSchema };

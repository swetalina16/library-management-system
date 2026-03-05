import { http, HttpResponse } from 'msw';

const mockBooks = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', genre: 'Fiction', published_year: 1925, total_copies: 3, available_copies: 3, is_available: 1 },
  { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061935466', genre: 'Fiction', published_year: 1960, total_copies: 2, available_copies: 0, is_available: 0 },
  { id: 3, title: '1984', author: 'George Orwell', isbn: '9780451524935', genre: 'Dystopian', published_year: 1949, total_copies: 4, available_copies: 2, is_available: 1 },
];

const mockUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', created_at: '2024-01-01' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', created_at: '2024-01-02' },
];

const futureDate = new Date(Date.now() + 10 * 86400000).toISOString();

const mockTransactions = [
  {
    id: 1, book_id: 2, user_id: 1, status: 'active',
    checkout_date: new Date(Date.now() - 4 * 86400000).toISOString(),
    due_date: futureDate,
    return_date: null,
    book_title: 'To Kill a Mockingbird', book_author: 'Harper Lee',
    user_name: 'Alice Johnson', user_email: 'alice@example.com',
  },
  {
    id: 2, book_id: 1, user_id: 2, status: 'returned',
    checkout_date: new Date(Date.now() - 20 * 86400000).toISOString(),
    due_date: new Date(Date.now() - 6 * 86400000).toISOString(),
    return_date: new Date(Date.now() - 8 * 86400000).toISOString(),
    book_title: 'The Great Gatsby', book_author: 'F. Scott Fitzgerald',
    user_name: 'Bob Smith', user_email: 'bob@example.com',
  },
];

export const handlers = [
  http.get('/api/books', ({ request }) => {
    const url = new URL(request.url);
    const available = url.searchParams.get('available');
    const genre = url.searchParams.get('genre');
    const search = url.searchParams.get('search');

    let books = [...mockBooks];
    if (available === 'true') books = books.filter((b) => b.available_copies > 0);
    if (genre) books = books.filter((b) => b.genre === genre);
    if (search) books = books.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()));

    return HttpResponse.json({
      books,
      pagination: { total: books.length, page: 1, limit: 12, totalPages: 1 },
    });
  }),

  http.get('/api/books/genres', () => {
    return HttpResponse.json(['Dystopian', 'Fiction']);
  }),

  http.get('/api/books/:id', ({ params }) => {
    const book = mockBooks.find((b) => b.id === parseInt(params.id));
    if (!book) return HttpResponse.json({ error: 'Book not found' }, { status: 404 });
    return HttpResponse.json(book);
  }),

  http.get('/api/users', () => {
    return HttpResponse.json({ users: mockUsers });
  }),

  http.get('/api/transactions', () => {
    return HttpResponse.json({ transactions: mockTransactions });
  }),

  http.post('/api/checkout/batch', async ({ request }) => {
    const body = await request.json();
    const user = mockUsers.find((u) => u.id === body.user_id);
    if (!user) return HttpResponse.json({ error: 'User not found' }, { status: 404 });

    const results = (body.book_ids || []).map((book_id) => {
      const book = mockBooks.find((b) => b.id === book_id);
      if (!book) return { book_id, success: false, error: 'Book not found' };
      if (book.available_copies < 1) return { book_id, book_title: book.title, success: false, error: 'No copies available' };
      return {
        book_id,
        book_title: book.title,
        success: true,
        transaction: {
          id: 10, book_id, user_id: user.id, status: 'active',
          checkout_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
          return_date: null,
          book_title: book.title, user_name: user.name, user_email: user.email,
        },
      };
    });

    return HttpResponse.json({ results, user_name: user.name });
  }),

  http.post('/api/return/batch', async ({ request }) => {
    const body = await request.json();
    const results = (body.transaction_ids || []).map((transaction_id) => {
      const tx = mockTransactions.find((t) => t.id === transaction_id);
      if (!tx) return { transaction_id, success: false, error: 'Transaction not found' };
      if (tx.status === 'returned') return { transaction_id, book_title: tx.book_title, user_name: tx.user_name, success: false, error: 'Already returned' };
      return {
        transaction_id,
        book_title: tx.book_title,
        user_name: tx.user_name,
        success: true,
        transaction: { ...tx, status: 'returned', return_date: new Date().toISOString() },
      };
    });
    return HttpResponse.json({ results });
  }),

  http.post('/api/checkout', async ({ request }) => {
    const body = await request.json();
    const book = mockBooks.find((b) => b.id === body.book_id);
    const user = mockUsers.find((u) => u.id === body.user_id);
    if (!book) return HttpResponse.json({ error: 'Book not found' }, { status: 404 });
    if (!user) return HttpResponse.json({ error: 'User not found' }, { status: 404 });
    if (book.available_copies < 1) return HttpResponse.json({ error: 'No copies available for checkout' }, { status: 409 });

    return HttpResponse.json({
      message: 'Book checked out successfully',
      transaction: {
        id: 3, book_id: book.id, user_id: user.id, status: 'active',
        checkout_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
        return_date: null,
        book_title: book.title, user_name: user.name, user_email: user.email,
      },
    }, { status: 201 });
  }),

  http.post('/api/return', async ({ request }) => {
    const body = await request.json();
    const tx = mockTransactions.find((t) => t.id === body.transaction_id);
    if (!tx) return HttpResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (tx.status === 'returned') return HttpResponse.json({ error: 'Book has already been returned' }, { status: 409 });

    return HttpResponse.json({
      message: 'Book returned successfully',
      transaction: { ...tx, status: 'returned', return_date: new Date().toISOString() },
    });
  }),
];

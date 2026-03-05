import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default client;

export const fetchBooks = async (params = {}) => {
  const { data } = await client.get('/books', { params });
  return data;
};

export const fetchBook = async (id) => {
  const { data } = await client.get(`/books/${id}`);
  return data;
};

export const fetchGenres = async () => {
  const { data } = await client.get('/books/genres');
  return data;
};

export const fetchUsers = async () => {
  const { data } = await client.get('/users');
  return data;
};

export const createUser = async (payload) => {
  const { data } = await client.post('/users', payload);
  return data;
};

export const checkoutBook = async (payload) => {
  const { data } = await client.post('/checkout', payload);
  return data;
};

// payload: { book_ids: [1, 2, 3], user_id: 4 }
export const batchCheckoutBooks = async (payload) => {
  const { data } = await client.post('/checkout/batch', payload);
  return data;
};

export const returnBook = async (payload) => {
  const { data } = await client.post('/return', payload);
  return data;
};

// payload: { transaction_ids: [1, 2, 3] }
export const batchReturnBooks = async (payload) => {
  const { data } = await client.post('/return/batch', payload);
  return data;
};

export const fetchTransactions = async (params = {}) => {
  const { data } = await client.get('/transactions', { params });
  return data;
};

export const fetchRecommendations = async (bookId) => {
  const { data } = await client.get(`/books/${bookId}/recommendations`);
  return data;
};

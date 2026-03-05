const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const booksRouter = require('./routes/books');
const transactionsRouter = require('./routes/transactions');
const usersRouter = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/books', booksRouter);
app.use('/api/users', usersRouter);
app.use('/api', transactionsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

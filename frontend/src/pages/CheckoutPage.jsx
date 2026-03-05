import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBooks, fetchUsers, checkoutBook } from '../api/client';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [bookId, setBookId] = useState(searchParams.get('book_id') || '');
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['books', { available: true, limit: 100 }],
    queryFn: () => fetchBooks({ available: true, limit: 100 }),
    staleTime: 15_000,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: checkoutBook,
    onSuccess: (data) => {
      setResult({ type: 'success', data });
      setBookId('');
      setUserId('');
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Checkout failed. Please try again.';
      setResult({ type: 'error', message: msg });
    },
  });

  const validate = () => {
    const errs = {};
    if (!bookId) errs.bookId = 'Please select a book.';
    if (!userId) errs.userId = 'Please select a user.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setResult(null);
    mutation.mutate({ book_id: parseInt(bookId), user_id: parseInt(userId) });
  };

  const selectedBook = booksData?.books?.find((b) => b.id === parseInt(bookId));

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📤 Checkout a Book</h1>
        <p className="page-subtitle">Select a book and a user to create a checkout record</p>
      </div>

      <div style={{ maxWidth: '560px' }}>
        {result?.type === 'success' && (
          <Alert type="success" onClose={() => setResult(null)}>
            <strong>Checkout successful!</strong> &ldquo;{result.data.transaction.book_title}&rdquo; checked out to {result.data.transaction.user_name}.
            Due date: <strong>{new Date(result.data.transaction.due_date).toLocaleDateString()}</strong>.
          </Alert>
        )}
        {result?.type === 'error' && (
          <Alert type="danger" onClose={() => setResult(null)}>{result.message}</Alert>
        )}

        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Checkout Form</span>
          </div>
          <div className="card-body">
            {booksLoading || usersLoading ? (
              <Spinner />
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="bookSelect">Book *</label>
                  <select
                    id="bookSelect"
                    className={`form-control${errors.bookId ? ' error' : ''}`}
                    value={bookId}
                    onChange={(e) => { setBookId(e.target.value); setErrors((p) => ({ ...p, bookId: '' })); }}
                    aria-describedby={errors.bookId ? 'bookError' : undefined}
                  >
                    <option value="">— Select a book —</option>
                    {booksData?.books?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} by {b.author} ({b.available_copies} copies left)
                      </option>
                    ))}
                  </select>
                  {errors.bookId && <p id="bookError" className="form-error">{errors.bookId}</p>}
                </div>

                {selectedBook && (
                  <div className="alert alert-info mt-3" style={{ gap: '.75rem', alignItems: 'flex-start' }}>
                    <span>📖</span>
                    <div>
                      <strong>{selectedBook.title}</strong>
                      <br />
                      <span className="text-sm">{selectedBook.author} · {selectedBook.genre} · {selectedBook.published_year}</span>
                      <br />
                      <span className="text-sm">ISBN: {selectedBook.isbn}</span>
                    </div>
                  </div>
                )}

                <div className="form-group mt-4">
                  <label className="form-label" htmlFor="userSelect">User *</label>
                  <select
                    id="userSelect"
                    className={`form-control${errors.userId ? ' error' : ''}`}
                    value={userId}
                    onChange={(e) => { setUserId(e.target.value); setErrors((p) => ({ ...p, userId: '' })); }}
                    aria-describedby={errors.userId ? 'userError' : undefined}
                  >
                    <option value="">— Select a user —</option>
                    {usersData?.users?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                  {errors.userId && <p id="userError" className="form-error">{errors.userId}</p>}
                </div>

                <div className="alert alert-warning mt-4" style={{ fontSize: '.8rem' }}>
                  ⏱ Loan period is <strong>14 days</strong>. The due date will be calculated automatically.
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full mt-4"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Processing…' : '📤 Confirm Checkout'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

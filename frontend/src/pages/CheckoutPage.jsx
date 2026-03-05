import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBooks, fetchUsers, batchCheckoutBooks } from '../api/client';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';
import BookRecommendations from '../components/BookRecommendations';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState('');
  const [cart, setCart] = useState([]);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  // Queries must be declared BEFORE any useEffect that references them
  const { data: booksData, isLoading: booksLoading, isError: booksError } = useQuery({
    queryKey: ['books', { available: true, limit: 100 }],
    queryFn: () => fetchBooks({ available: true, limit: 100 }),
    staleTime: 15_000,
  });

  const { data: usersData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 30_000,
  });

  // If the page was opened with ?book_id=X (e.g. from catalog), auto-add that book to cart
  useEffect(() => {
    const id = searchParams.get('book_id');
    if (!id || !booksData?.books) return;
    const book = booksData.books.find((b) => b.id === parseInt(id));
    if (book) setCart((prev) => prev.some((b) => b.id === book.id) ? prev : [...prev, book]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booksData]);

  const mutation = useMutation({
    mutationFn: batchCheckoutBooks,
    onSuccess: (data) => {
      setResult({ type: 'done', data });
      setCart([]);
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

  // Books already in the cart (by id) — exclude from the dropdown
  const cartIds = cart.map((b) => b.id);
  const availableBooks = booksData?.books?.filter((b) => !cartIds.includes(b.id)) || [];

  const removeFromCart = (bookId) => {
    setCart((prev) => prev.filter((b) => b.id !== bookId));
  };

  // Called when user clicks "+ Add to Cart" on an AI recommendation
  const addRecommendationToCart = (recommendedBook) => {
    setCart((prev) => {
      if (prev.some((b) => b.id === recommendedBook.id)) return prev;
      return [...prev, recommendedBook];
    });
    setErrors((p) => ({ ...p, cart: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalCart = cart;

    const errs = {};
    if (finalCart.length === 0) errs.cart = 'Please select a book first.';
    if (!userId) errs.userId = 'Please select a user.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setResult(null);
    mutation.mutate({ book_ids: finalCart.map((b) => b.id), user_id: parseInt(userId) });
  };

  // How many succeeded in the last batch
  const successCount = result?.data?.results?.filter((r) => r.success).length || 0;
  const failCount = result?.data?.results?.filter((r) => !r.success).length || 0;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📤 Checkout Books</h1>
        <p className="page-subtitle">Add books to your cart, then checkout all at once</p>
      </div>

      <div style={{ maxWidth: '600px' }}>

        {/* Batch result summary */}
        {result?.type === 'done' && (
          <Alert type={failCount === 0 ? 'success' : 'warning'} onClose={() => setResult(null)}>
            <div>
              <strong>
                {successCount > 0 && `${successCount} book${successCount > 1 ? 's' : ''} checked out successfully!`}
                {failCount > 0 && ` ${failCount} failed.`}
              </strong>
              <ul style={{ margin: '.5rem 0 0', paddingLeft: '1.25rem', fontSize: '.875rem' }}>
                {result.data.results.map((r) => (
                  <li key={r.book_id} style={{ color: r.success ? 'inherit' : 'var(--color-danger)' }}>
                    {r.success ? '✓' : '✕'} &quot;{r.book_title}&quot;
                    {r.success
                      ? ` — due ${new Date(r.transaction.due_date).toLocaleDateString()}`
                      : ` — ${r.error}`}
                  </li>
                ))}
              </ul>
            </div>
          </Alert>
        )}
        {result?.type === 'error' && (
          <Alert type="danger" onClose={() => setResult(null)}>{result.message}</Alert>
        )}

        <div className="card mt-4">
          <div className="card-header">
            <span className="card-title">Checkout Form</span>
            {cart.length > 0 && (
              <span className="badge badge-primary">{cart.length} book{cart.length > 1 ? 's' : ''} in cart</span>
            )}
          </div>

          <div className="card-body">
            {(booksError || usersError) && (
              <Alert type="danger">
                {booksError ? 'Failed to load available books.' : 'Failed to load users.'} Please refresh and try again.
              </Alert>
            )}

            {booksLoading || usersLoading ? (
              <Spinner message={booksLoading ? 'Loading books...' : 'Loading users...'} />
            ) : (
              <form onSubmit={handleSubmit} noValidate>

                {/* ── Step 1: Add books to cart — selecting instantly adds ── */}
                <p className="form-label" style={{ marginBottom: '.5rem' }}>Step 1 — Select books</p>
                <select
                  className={`form-control${errors.cart ? ' error' : ''}`}
                  value=""
                  onChange={(e) => {
                    const selected = booksData?.books?.find((b) => b.id === parseInt(e.target.value));
                    if (selected && !cartIds.includes(selected.id)) {
                      setCart((prev) => [...prev, selected]);
                      setErrors((p) => ({ ...p, cart: '' }));
                    }
                  }}
                  aria-label="Select a book to add to cart"
                >
                  <option value="">— Select a book to add —</option>
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} by {b.author} ({b.available_copies} left)
                    </option>
                  ))}
                </select>

                {/* Cart — books added so far */}
                {cart.length > 0 && (
                  <div className="card mt-3" style={{ border: '1px solid var(--color-primary, #4f46e5)' }}>
                    <div className="card-header" style={{ background: 'var(--color-primary-light, #eef2ff)' }}>
                      <span className="card-title" style={{ fontSize: '.875rem' }}>🛒 Cart ({cart.length})</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCart([])}>
                        Clear all
                      </button>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                      {cart.map((book) => (
                        <div
                          key={book.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '.75rem',
                            padding: '.5rem .75rem',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary, #f8fafc)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{book.title}</span>
                            <span className="text-sm text-muted" style={{ marginLeft: '.5rem' }}>{book.author}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(book.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}
                            aria-label={`Remove ${book.title}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.cart && <p className="form-error mt-1">{errors.cart}</p>}

                {/* ── Step 2: Select user ── */}
                <div className="form-group mt-4">
                  <label className="form-label" htmlFor="userSelect">Step 2 — Select user *</label>
                  <select
                    id="userSelect"
                    className={`form-control${errors.userId ? ' error' : ''}`}
                    value={userId}
                    onChange={(e) => { setUserId(e.target.value); setErrors((p) => ({ ...p, userId: '' })); }}
                  >
                    <option value="">— Select a user —</option>
                    {usersData?.users?.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                  {errors.userId && <p className="form-error">{errors.userId}</p>}
                </div>

                <div className="alert alert-warning mt-4" style={{ fontSize: '.8rem' }}>
                  ⏱ Loan period is <strong>14 days</strong> per book. Due dates are calculated automatically.
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full mt-4"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? 'Processing…'
                    : cart.length > 1
                      ? `📤 Checkout ${cart.length} Books`
                      : '📤 Confirm Checkout'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* AI recommendations — based on the last book added to cart */}
        {cart[cart.length - 1]?.id && (
          <BookRecommendations
            bookId={cart[cart.length - 1].id}
            onAddToCart={addRecommendationToCart}
            cartIds={cartIds}
          />
        )}
      </div>
    </div>
  );
}

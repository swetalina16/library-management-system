import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, batchReturnBooks } from '../api/client';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const isOverdue = (tx) => new Date(tx.due_date) < new Date();

export default function ReturnPage() {
  const queryClient = useQueryClient();

  const [currentTxId, setCurrentTxId] = useState('');
  const [queue, setQueue] = useState([]);               // transactions queued for return
  const [userFilter, setUserFilter] = useState('');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['transactions', { status: 'active' }],
    queryFn: () => fetchTransactions({ status: 'active' }),
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: batchReturnBooks,
    onSuccess: (res) => {
      setResult({ type: 'done', data: res });
      setQueue([]);
      setCurrentTxId('');
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Return failed. Please try again.';
      setResult({ type: 'error', message: msg });
    },
  });

  const activeTransactions = data?.transactions || [];

  // IDs already in the return queue
  const queueIds = queue.map((t) => t.id);

  // Filter the dropdown: by user search AND not already queued
  const filteredTransactions = activeTransactions.filter((t) => {
    const matchesUser = !userFilter ||
      t.user_name.toLowerCase().includes(userFilter.toLowerCase()) ||
      t.user_email.toLowerCase().includes(userFilter.toLowerCase());
    return matchesUser && !queueIds.includes(t.id);
  });

  const removeFromQueue = (txId) => {
    setQueue((prev) => prev.filter((t) => t.id !== txId));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (queue.length === 0) {
      setErrors({ queue: 'Please select a checkout record first.' });
      return;
    }

    setResult(null);
    mutation.mutate({ transaction_ids: queueIds });
  };

  const successCount = result?.data?.results?.filter((r) => r.success).length || 0;
  const failCount    = result?.data?.results?.filter((r) => !r.success).length || 0;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📥 Return Books</h1>
        <p className="page-subtitle">Add checkouts to the return queue, then confirm all at once</p>
      </div>

      <div style={{ maxWidth: '640px' }}>

        {/* Batch result summary */}
        {result?.type === 'done' && (
          <Alert type={failCount === 0 ? 'success' : 'warning'} onClose={() => setResult(null)}>
            <div>
              <strong>
                {successCount > 0 && `${successCount} book${successCount > 1 ? 's' : ''} returned successfully!`}
                {failCount > 0 && ` ${failCount} failed.`}
              </strong>
              <ul style={{ margin: '.5rem 0 0', paddingLeft: '1.25rem', fontSize: '.875rem' }}>
                {result.data.results.map((r) => (
                  <li key={r.transaction_id} style={{ color: r.success ? 'inherit' : 'var(--color-danger)' }}>
                    {r.success ? '✓' : '✕'} &quot;{r.book_title}&quot; — {r.user_name}
                    {!r.success && ` (${r.error})`}
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
            <span className="card-title">Return Form</span>
            {activeTransactions.length > 0 && (
              <span className="badge badge-warning">{activeTransactions.length} active</span>
            )}
          </div>

          <div className="card-body">
            {isError && (
              <Alert type="danger">
                Failed to load active checkouts: {error?.response?.data?.error || error.message}
              </Alert>
            )}

            {isLoading ? (
              <Spinner message="Loading active checkouts..." />
            ) : activeTransactions.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <div className="empty-state-icon">🎉</div>
                <h3 className="empty-state-title">No active checkouts</h3>
                <p className="empty-state-text">All books have been returned.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>

                {/* User filter */}
                <div className="form-group">
                  <label className="form-label" htmlFor="userFilterInput">Filter by user</label>
                  <input
                    id="userFilterInput"
                    type="text"
                    className="form-control"
                    placeholder="Search by name or email…"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                  />
                </div>

                {/* Dropdown — selecting instantly adds to queue */}
                <div className="form-group mt-3">
                  <label className="form-label">Select checkout to return *</label>
                  <select
                    className={`form-control${errors.queue ? ' error' : ''}`}
                    value={currentTxId}
                    onChange={(e) => {
                      const selected = activeTransactions.find((t) => t.id === parseInt(e.target.value));
                      if (selected && !queueIds.includes(selected.id)) {
                        setQueue((prev) => [...prev, selected]);
                        setErrors((p) => ({ ...p, queue: '' }));
                      }
                      setCurrentTxId('');
                    }}
                    aria-label="Select a checkout record"
                  >
                    <option value="">— Select a checkout to add —</option>
                    {filteredTransactions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {isOverdue(t) ? '⚠ ' : ''}[#{t.id}] &quot;{t.book_title}&quot; — {t.user_name} (due {new Date(t.due_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Return queue */}
                {queue.length > 0 && (
                  <div className="card mt-3" style={{ border: '1px solid var(--color-success, #16a34a)' }}>
                    <div className="card-header" style={{ background: 'var(--color-success-light, #f0fdf4)' }}>
                      <span className="card-title" style={{ fontSize: '.875rem' }}>📥 Return Queue ({queue.length})</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQueue([])}>
                        Clear all
                      </button>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                      {queue.map((tx) => (
                        <div
                          key={tx.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '.75rem',
                            padding: '.5rem .75rem',
                            borderRadius: '6px',
                            background: isOverdue(tx) ? '#fff7ed' : 'var(--bg-secondary, #f8fafc)',
                            border: isOverdue(tx) ? '1px solid #fed7aa' : '1px solid transparent',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{tx.book_title}</span>
                            <span className="text-sm text-muted" style={{ marginLeft: '.5rem' }}>{tx.user_name}</span>
                            {isOverdue(tx) && (
                              <span style={{ marginLeft: '.5rem', fontSize: '.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>⚠ OVERDUE</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromQueue(tx.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}
                            aria-label={`Remove ${tx.book_title}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.queue && <p className="form-error mt-1">{errors.queue}</p>}

                <button
                  type="submit"
                  className="btn btn-success btn-full mt-4"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending
                    ? 'Processing…'
                    : queue.length > 1
                      ? `📥 Return ${queue.length} Books`
                      : '📥 Confirm Return'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

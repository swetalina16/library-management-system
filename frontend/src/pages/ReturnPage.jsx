import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, returnBook } from '../api/client';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

export default function ReturnPage() {
  const queryClient = useQueryClient();
  const [transactionId, setTransactionId] = useState('');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [userFilter, setUserFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { status: 'active' }],
    queryFn: () => fetchTransactions({ status: 'active' }),
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: returnBook,
    onSuccess: (res) => {
      setResult({ type: 'success', data: res });
      setTransactionId('');
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
  const filteredTransactions = userFilter
    ? activeTransactions.filter((t) =>
        t.user_name.toLowerCase().includes(userFilter.toLowerCase()) ||
        t.user_email.toLowerCase().includes(userFilter.toLowerCase())
      )
    : activeTransactions;

  const selectedTx = activeTransactions.find((t) => t.id === parseInt(transactionId));

  const isOverdue = (tx) => new Date(tx.due_date) < new Date();

  const validate = () => {
    const errs = {};
    if (!transactionId) errs.transactionId = 'Please select an active checkout record.';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setResult(null);
    mutation.mutate({ transaction_id: parseInt(transactionId) });
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📥 Return a Book</h1>
        <p className="page-subtitle">Select an active checkout to process a book return</p>
      </div>

      <div style={{ maxWidth: '620px' }}>
        {result?.type === 'success' && (
          <Alert type="success" onClose={() => setResult(null)}>
            <strong>Return successful!</strong> &ldquo;{result.data.transaction.book_title}&rdquo; returned by {result.data.transaction.user_name}.
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
            {isLoading ? (
              <Spinner />
            ) : activeTransactions.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 0' }}>
                <div className="empty-state-icon">🎉</div>
                <h3 className="empty-state-title">No active checkouts</h3>
                <p className="empty-state-text">All books have been returned.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
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

                <div className="form-group mt-3">
                  <label className="form-label" htmlFor="txSelect">Active Checkout *</label>
                  <select
                    id="txSelect"
                    className={`form-control${errors.transactionId ? ' error' : ''}`}
                    value={transactionId}
                    onChange={(e) => { setTransactionId(e.target.value); setErrors({}); }}
                    aria-describedby={errors.transactionId ? 'txError' : undefined}
                  >
                    <option value="">— Select a checkout record —</option>
                    {filteredTransactions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {isOverdue(t) ? '⚠ ' : ''}[#{t.id}] &quot;{t.book_title}&quot; — {t.user_name} (due {new Date(t.due_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  {errors.transactionId && <p id="txError" className="form-error">{errors.transactionId}</p>}
                </div>

                {selectedTx && (
                  <div className={`alert mt-3 ${isOverdue(selectedTx) ? 'alert-warning' : 'alert-info'}`}>
                    <span>📋</span>
                    <div style={{ fontSize: '.875rem' }}>
                      <div><strong>{selectedTx.book_title}</strong> by {selectedTx.book_author}</div>
                      <div>Checked out by: <strong>{selectedTx.user_name}</strong> ({selectedTx.user_email})</div>
                      <div>Checked out on: {new Date(selectedTx.checkout_date).toLocaleDateString()}</div>
                      <div>
                        Due: <strong>{new Date(selectedTx.due_date).toLocaleDateString()}</strong>
                        {isOverdue(selectedTx) && <span style={{ color: 'var(--color-warning)', marginLeft: '.5rem' }}>⚠ OVERDUE</span>}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-success btn-full mt-4"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Processing…' : '📥 Confirm Return'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

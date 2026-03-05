import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchUsers } from '../api/client';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const STATUS_BADGE = {
  active: 'badge-warning',
  returned: 'badge-success',
  overdue: 'badge-danger',
};

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['transactions', { status: statusFilter, user_id: userFilter }],
    queryFn: () => fetchTransactions({
      ...(statusFilter && { status: statusFilter }),
      ...(userFilter && { user_id: userFilter }),
    }),
    staleTime: 10_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 60_000,
  });

  const transactions = data?.transactions || [];

  const counts = transactions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const isOverdue = (tx) => tx.status === 'active' && new Date(tx.due_date) < new Date();

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📋 Transactions</h1>
        <p className="page-subtitle">View all checkout and return history</p>
      </div>

      {!isLoading && transactions.length > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon indigo">📊</div>
            <div>
              <div className="stat-label">Total</div>
              <div className="stat-value">{transactions.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">🔄</div>
            <div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{counts.active || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <div className="stat-label">Returned</div>
              <div className="stat-value">{counts.returned || 0}</div>
            </div>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <select
          className="form-control"
          style={{ maxWidth: '180px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
        </select>

        <select
          className="form-control"
          style={{ maxWidth: '220px' }}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          aria-label="Filter by user"
        >
          <option value="">All Users</option>
          {usersData?.users?.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        {(statusFilter || userFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter(''); setUserFilter(''); }}>
            Clear filters
          </button>
        )}
      </div>

      {isError && (
        <Alert type="danger">
          Failed to load transactions: {error?.response?.data?.error || error.message}
        </Alert>
      )}

      {isLoading ? (
        <Spinner />
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">No transactions found</h3>
          <p className="empty-state-text">
            {statusFilter || userFilter ? 'Try adjusting your filters.' : 'No checkout records yet.'}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table" aria-label="Transactions table">
            <thead>
              <tr>
                <th>#</th>
                <th>Book</th>
                <th>User</th>
                <th>Checked Out</th>
                <th>Due Date</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const overdue = isOverdue(tx);
                return (
                  <tr key={tx.id} style={overdue ? { background: '#fff7ed' } : undefined}>
                    <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>#{tx.id}</td>
                    <td>
                      <div className="font-medium">{tx.book_title}</div>
                      <div className="text-xs text-muted">{tx.book_author}</div>
                    </td>
                    <td>
                      <div>{tx.user_name}</div>
                      <div className="text-xs text-muted">{tx.user_email}</div>
                    </td>
                    <td className="text-sm">{new Date(tx.checkout_date).toLocaleDateString()}</td>
                    <td className="text-sm" style={overdue ? { color: 'var(--color-danger)', fontWeight: 600 } : undefined}>
                      {new Date(tx.due_date).toLocaleDateString()}
                      {overdue && ' ⚠'}
                    </td>
                    <td className="text-sm text-muted">
                      {tx.return_date ? new Date(tx.return_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[overdue ? 'overdue' : tx.status] || 'badge-neutral'}`}>
                        {overdue ? 'Overdue' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

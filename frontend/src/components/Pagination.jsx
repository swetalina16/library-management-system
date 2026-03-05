export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 1;
  const range = [];

  for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
    range.push(i);
  }
  if (page - delta > 2) range.unshift('...');
  if (page + delta < totalPages - 1) range.push('...');
  range.unshift(1);
  if (totalPages > 1) range.push(totalPages);

  return (
    <div className="pagination" aria-label="Pagination">
      <button
        className="page-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ←
      </button>
      {range.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} style={{ padding: '0 .25rem', color: 'var(--color-text-muted)' }}>…</span>
        ) : (
          <button
            key={p}
            className={`page-btn${page === p ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={page === p ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className="page-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}

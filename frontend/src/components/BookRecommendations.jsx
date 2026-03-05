import { useQuery } from '@tanstack/react-query';
import { fetchRecommendations } from '../api/client';
import Spinner from './Spinner';

const GENRE_EMOJIS = {
  Fiction: '📖',
  Fantasy: '🧙',
  Dystopian: '🌆',
  Romance: '💕',
  'Non-Fiction': '🔬',
  Technology: '💻',
  Drama: '🎭',
};

// A single recommended book row
// onAddToCart — callback to add book to the checkout cart directly
// cartIds     — ids already in cart, so we can show "Added" state
function RecommendedBook({ book, onAddToCart, cartIds = [] }) {
  const emoji = GENRE_EMOJIS[book.genre] || '📚';
  const available = book.available_copies > 0;
  const inCart = cartIds.includes(book.id);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '.75rem',
        borderRadius: '8px',
        background: 'var(--bg-secondary, #f8fafc)',
        border: `1px solid ${inCart ? 'var(--color-success, #16a34a)' : 'var(--border-color, #e2e8f0)'}`,
      }}
    >
      <span style={{ fontSize: '1.75rem' }}>{emoji}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {book.title}
        </p>
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          {book.author} · {book.genre}
        </p>
      </div>

      <button
        type="button"
        className={`btn btn-sm ${inCart ? 'btn-ghost' : 'btn-primary'}`}
        style={{ whiteSpace: 'nowrap', opacity: available ? 1 : 0.45 }}
        disabled={!available || inCart}
        onClick={() => onAddToCart && onAddToCart(book)}
      >
        {inCart ? '✓ Added' : available ? '+ Add to Cart' : 'Unavailable'}
      </button>
    </div>
  );
}

/**
 * Shows an AI-generated "You might also like" section for a given book.
 * Renders nothing if the API key is not configured or no results come back.
 *
 * @param {number}   bookId      - Book to base recommendations on
 * @param {function} onAddToCart - Called with a book object when user clicks "+ Add to Cart"
 * @param {number[]} cartIds     - IDs already in the cart (shows "✓ Added" state)
 */
export default function BookRecommendations({ bookId, onAddToCart, cartIds = [] }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recommendations', bookId],
    queryFn: () => fetchRecommendations(bookId),
    staleTime: 5 * 60_000, // cache per book for 5 minutes
    retry: false,           // don't retry — if AI fails, fail quietly
  });

  if (isLoading) {
    return (
      <div className="card mt-4">
        <div className="card-header">
          <span className="card-title">✨ AI Recommendations</span>
        </div>
        <div className="card-body" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <Spinner />
          <p className="text-sm text-muted mt-2">Finding similar books…</p>
        </div>
      </div>
    );
  }

  // If error or no results, hide the section entirely — no noisy error messages
  if (isError || !data?.recommendations?.length) return null;

  return (
    <div className="card mt-4">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="card-title">✨ You might also like</span>
        <span className="text-xs text-muted" style={{ fontWeight: 400 }}>Powered by AI</span>
      </div>
      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {data.recommendations.map((book) => (
          <RecommendedBook key={book.id} book={book} onAddToCart={onAddToCart} cartIds={cartIds} />
        ))}
      </div>
    </div>
  );
}

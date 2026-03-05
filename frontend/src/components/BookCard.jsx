import { Link } from 'react-router-dom';

const GENRE_COLORS = {
  Fiction: '#4f46e5',
  Fantasy: '#7c3aed',
  Dystopian: '#dc2626',
  Romance: '#db2777',
  'Non-Fiction': '#0891b2',
  Technology: '#0284c7',
  Drama: '#d97706',
};

const GENRE_EMOJIS = {
  Fiction: '📖',
  Fantasy: '🧙',
  Dystopian: '🌆',
  Romance: '💕',
  'Non-Fiction': '🔬',
  Technology: '💻',
  Drama: '🎭',
};

export default function BookCard({ book }) {
  const color = GENRE_COLORS[book.genre] || '#4f46e5';
  const emoji = GENRE_EMOJIS[book.genre] || '📚';
  const available = book.available_copies > 0;

  return (
    <div className="book-card">
      <div className="book-card-cover" style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}>
        <span style={{ fontSize: '3.5rem' }}>{emoji}</span>
      </div>
      <div className="book-card-body">
        <h3 className="book-card-title">{book.title}</h3>
        <p className="book-card-author">{book.author}</p>
        <span className="badge badge-primary" style={{ alignSelf: 'flex-start', marginTop: '.25rem' }}>
          {book.genre}
        </span>
        {book.published_year && (
          <p className="text-xs text-muted mt-1">{book.published_year}</p>
        )}
      </div>
      <div className="book-card-footer">
        <span className={`badge ${available ? 'badge-success' : 'badge-danger'}`}>
          {available ? `✓ ${book.available_copies} available` : '✗ Unavailable'}
        </span>
        <Link to={`/checkout?book_id=${book.id}`} className="btn btn-sm btn-primary" style={{ pointerEvents: available ? 'auto' : 'none', opacity: available ? 1 : .45 }}>
          Checkout
        </Link>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBooks, fetchGenres } from '../api/client';
import BookCard from '../components/BookCard';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import Alert from '../components/Alert';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const queryParams = {
    page,
    limit: 12,
    ...(search && { search }),
    ...(genre && { genre }),
    ...(availableOnly && { available: true }),
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['books', queryParams],
    queryFn: () => fetchBooks(queryParams),
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: fetchGenres,
    staleTime: 60_000 * 5,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputVal.trim());
    setPage(1);
  };

  const handleGenreChange = (e) => {
    setGenre(e.target.value);
    setPage(1);
  };

  const handleAvailableChange = (e) => {
    setAvailableOnly(e.target.checked);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setInputVal('');
    setGenre('');
    setAvailableOnly(false);
    setPage(1);
  };

  const hasFilters = search || genre || availableOnly;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📚 Library Catalog</h1>
        <p className="page-subtitle">Browse and checkout books from our collection</p>
      </div>

      {data?.books && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon indigo">📖</div>
            <div>
              <div className="stat-label">Total Books</div>
              <div className="stat-value">{data.pagination.total}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon cyan">🔍</div>
            <div>
              <div className="stat-label">Showing</div>
              <div className="stat-value">{data.books.length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <div className="stat-label">Available</div>
              <div className="stat-value">{data.books.filter((b) => b.available_copies > 0).length}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">🏷</div>
            <div>
              <div className="stat-label">Genres</div>
              <div className="stat-value">{genres.length}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="filters-bar">
        <div className="search-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="form-control"
            placeholder="Search by title, author or ISBN…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            aria-label="Search books"
          />
        </div>
        <select
          className="form-control"
          value={genre}
          onChange={handleGenreChange}
          style={{ maxWidth: '180px' }}
          aria-label="Filter by genre"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.875rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={handleAvailableChange}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
          />
          Available only
        </label>
        <button type="submit" className="btn btn-primary">Search</button>
        {hasFilters && (
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>
        )}
      </form>

      {isError && (
        <Alert type="danger">
          Failed to load books: {error?.response?.data?.error || error.message}
        </Alert>
      )}

      {isLoading ? (
        <Spinner message="Loading books..." />
      ) : data?.books?.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3 className="empty-state-title">No books found</h3>
          <p className="empty-state-text">
            {hasFilters ? 'Try adjusting your search or filters.' : 'No books in the library yet.'}
          </p>
          {hasFilters && (
            <button className="btn btn-outline mt-4" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="book-grid">
            {data?.books?.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
            <p className="text-sm text-muted">
              Showing {((page - 1) * 12) + 1}–{Math.min(page * 12, data?.pagination?.total || 0)} of {data?.pagination?.total || 0} books
            </p>
            <Pagination
              page={page}
              totalPages={data?.pagination?.totalPages || 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '../pages/HomePage';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('HomePage', () => {
  it('renders the page title', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Library Catalog/i)).toBeInTheDocument();
  });

  it('shows a loading spinner initially', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays books after loading', async () => {
    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    });
    expect(screen.getByText('To Kill a Mockingbird')).toBeInTheDocument();
    expect(screen.getByText('1984')).toBeInTheDocument();
  });

  it('shows availability badges', async () => {
    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    });
    const availableBadges = screen.getAllByText(/available/i);
    expect(availableBadges.length).toBeGreaterThan(0);
  });

  it('renders genre filter dropdown', async () => {
    renderWithProviders(<HomePage />);
    const genreSelect = screen.getByLabelText(/Filter by genre/i);
    expect(genreSelect).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByPlaceholderText(/Search by title/i)).toBeInTheDocument();
  });

  it('shows empty state when no books match search', async () => {
    const { http, HttpResponse } = await import('msw');
    const { server } = await import('./setup');
    server.use(
      http.get('/api/books', () =>
        HttpResponse.json({ books: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 0 } })
      )
    );

    renderWithProviders(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText(/No books found/i)).toBeInTheDocument();
    });
  });
});

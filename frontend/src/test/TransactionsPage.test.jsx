import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransactionsPage from '../pages/TransactionsPage';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('TransactionsPage', () => {
  it('renders the page heading', () => {
    renderWithProviders(<TransactionsPage />);
    expect(screen.getByText(/Transactions/i)).toBeInTheDocument();
  });

  it('displays transactions in a table', async () => {
    renderWithProviders(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getByText('To Kill a Mockingbird')).toBeInTheDocument();
    });
    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
  });

  it('shows user names in the table', async () => {
    renderWithProviders(<TransactionsPage />);
    await waitFor(() => {
      // name appears in both the filter dropdown option and the table cell
      expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
  });

  it('shows status badges', async () => {
    renderWithProviders(<TransactionsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Returned/i).length).toBeGreaterThan(0);
  });

  it('renders status filter dropdown', () => {
    renderWithProviders(<TransactionsPage />);
    expect(screen.getByLabelText(/Filter by status/i)).toBeInTheDocument();
  });

  it('renders user filter dropdown', async () => {
    renderWithProviders(<TransactionsPage />);
    expect(screen.getByLabelText(/Filter by user/i)).toBeInTheDocument();
  });
});

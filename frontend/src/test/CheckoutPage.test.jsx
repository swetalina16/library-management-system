import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckoutPage from '../pages/CheckoutPage';

function renderWithProviders(ui, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('CheckoutPage', () => {
  it('renders the checkout form heading', () => {
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText(/Checkout a Book/i)).toBeInTheDocument();
  });

  it('renders the form after data loads', async () => {
    renderWithProviders(<CheckoutPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Book/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/User/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByText('Confirm Checkout', { exact: false })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm Checkout/i });
    await user.click(submitBtn);

    expect(screen.getByText(/Please select a book/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a user/i)).toBeInTheDocument();
  });

  it('shows selected book details after choosing a book', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Book/i)).toBeInTheDocument();
    });

    const bookSelect = screen.getByLabelText(/Book/i);
    await user.selectOptions(bookSelect, '1');

    await waitFor(() => {
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    });
  });

  it('submits successfully and shows success message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckoutPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Book/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/Book/i), '1');
    await user.selectOptions(screen.getByLabelText(/User/i), '1');
    await user.click(screen.getByRole('button', { name: /Confirm Checkout/i }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout successful/i)).toBeInTheDocument();
    });
  });

  it('pre-selects book when book_id is in query params', async () => {
    renderWithProviders(<CheckoutPage />, { route: '/checkout?book_id=1' });
    await waitFor(() => {
      const bookSelect = screen.getByLabelText(/Book/i);
      expect(bookSelect.value).toBe('1');
    });
  });
});

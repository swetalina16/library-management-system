import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReturnPage from '../pages/ReturnPage';

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ReturnPage', () => {
  it('renders the return form heading', () => {
    renderWithProviders(<ReturnPage />);
    expect(screen.getByText(/Return a Book/i)).toBeInTheDocument();
  });

  it('shows active checkout options in the select', async () => {
    renderWithProviders(<ReturnPage />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Active Checkout/i)).toBeInTheDocument();
    });
    const select = screen.getByLabelText(/Active Checkout/i);
    expect(select).toBeInTheDocument();
  });

  it('shows validation error when no transaction is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReturnPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Confirm Return/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Confirm Return/i }));
    expect(screen.getByText(/Please select an active checkout/i)).toBeInTheDocument();
  });

  it('displays transaction details after selecting one', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReturnPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Active Checkout/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Active Checkout/i);
    await user.selectOptions(select, '1');

    await waitFor(() => {
      expect(screen.getByText('To Kill a Mockingbird')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('shows success message after successful return', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReturnPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Active Checkout/i)).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText(/Active Checkout/i), '1');
    await user.click(screen.getByRole('button', { name: /Confirm Return/i }));

    await waitFor(() => {
      expect(screen.getByText(/Return successful/i)).toBeInTheDocument();
    });
  });
});

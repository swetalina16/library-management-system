import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Alert from '../components/Alert';
import BookCard from '../components/BookCard';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';

describe('Alert component', () => {
  it('renders success alert with message', () => {
    render(<Alert type="success">Operation successful</Alert>);
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('alert-success');
  });

  it('renders danger alert', () => {
    render(<Alert type="danger">Something went wrong</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('alert-danger');
  });

  it('calls onClose when dismiss button clicked', () => {
    const handleClose = vi.fn();
    render(<Alert type="info" onClose={handleClose}>Message</Alert>);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button without onClose', () => {
    render(<Alert type="info">Message</Alert>);
    expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument();
  });
});

describe('Spinner component', () => {
  it('renders with default message', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<Spinner message="Loading books..." />);
    expect(screen.getByText('Loading books...')).toBeInTheDocument();
  });
});

describe('BookCard component', () => {
  const availableBook = {
    id: 1, title: 'Test Book', author: 'Test Author',
    isbn: '1234567890', genre: 'Fiction', published_year: 2020,
    total_copies: 3, available_copies: 2,
  };

  const unavailableBook = { ...availableBook, id: 2, available_copies: 0 };

  it('renders book title and author', () => {
    render(<BrowserRouter><BookCard book={availableBook} /></BrowserRouter>);
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('shows available badge when copies are available', () => {
    render(<BrowserRouter><BookCard book={availableBook} /></BrowserRouter>);
    expect(screen.getByText(/2 available/i)).toBeInTheDocument();
  });

  it('shows unavailable badge when no copies', () => {
    render(<BrowserRouter><BookCard book={unavailableBook} /></BrowserRouter>);
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();
  });

  it('renders genre badge', () => {
    render(<BrowserRouter><BookCard book={availableBook} /></BrowserRouter>);
    expect(screen.getByText('Fiction')).toBeInTheDocument();
  });

  it('renders published year', () => {
    render(<BrowserRouter><BookCard book={availableBook} /></BrowserRouter>);
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('renders checkout link', () => {
    render(<BrowserRouter><BookCard book={availableBook} /></BrowserRouter>);
    expect(screen.getByText('Checkout')).toBeInTheDocument();
  });
});

describe('Pagination component', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders page buttons', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
  });

  it('marks current page as active', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Page 2')).toHaveClass('active');
  });

  it('calls onPageChange when a page is clicked', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onChange} />);
    // When on page 1, pages 1, 2, ..., 5 are shown (page 3 hidden by ellipsis)
    fireEvent.click(screen.getByLabelText('Page 2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });
});

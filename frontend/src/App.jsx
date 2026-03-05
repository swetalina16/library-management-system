import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import ReturnPage from './pages/ReturnPage';
import TransactionsPage from './pages/TransactionsPage';

export default function App() {
  return (
    <>
      <Navbar />
      <main style={{ paddingBottom: '3rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/return" element={<ReturnPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="*" element={
            <div className="container">
              <div className="empty-state" style={{ paddingTop: '5rem' }}>
                <div className="empty-state-icon">🔍</div>
                <h2 className="empty-state-title">404 — Page not found</h2>
                <p className="empty-state-text">The page you&apos;re looking for doesn&apos;t exist.</p>
                <a href="/" className="btn btn-primary mt-4">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </main>
    </>
  );
}

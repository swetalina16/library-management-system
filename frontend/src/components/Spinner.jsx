export default function Spinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <div className="spinner" />
      <p className="text-sm text-muted mt-2" style={{ textAlign: 'center' }}>{message}</p>
    </div>
  );
}

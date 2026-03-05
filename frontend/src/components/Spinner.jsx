export default function Spinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-wrap" role="status" aria-label={message}>
      <div className="spinner" />
    </div>
  );
}

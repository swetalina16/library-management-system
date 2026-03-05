export default function Alert({ type = 'info', children, onClose }) {
  const icons = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ' };
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span style={{ flexShrink: 0 }}>{icons[type]}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: .7 }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

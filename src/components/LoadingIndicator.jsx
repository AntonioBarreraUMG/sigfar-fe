export function LoadingIndicator({ label = 'Cargando información…', inline = false }) {
  return <div className={`sigfar-loading ${inline ? 'sigfar-loading--inline' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <span className="sigfar-spinner" aria-hidden="true" />
    <span>{label}</span>
  </div>;
}

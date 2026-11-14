import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <header className="data-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="data-heading-action">{action}</div>}
    </header>
  );
}
export function ErrorNotice({ message, retry }) {
  if (!message) return null;
  return (
    <div role="alert" className="data-message data-message--error">
      <Icon name="alert" size={18} />
      <span>{message}</span>
      {retry && (
        <button type="button" className="text-action" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function SuccessNotice({ message, onClose }) {
  if (!message) return null;
  return (
    <div role="status" className="data-message data-message--success">
      <Icon name="check" size={18} />
      <span>{message}</span>
      {onClose && (
        <button type="button" className="text-action" onClick={onClose}>
          Cerrar
        </button>
      )}
    </div>
  );
}
export function Pager({ desde, limite, count, onPageChange, disabled = false }) {
  return (
    <div className="pager">
      <span>
        Registros {count ? `${desde + 1}–${desde + count}` : '0'} · Sin conteo total de la API
      </span>
      <div>
        <button
          type="button"
          disabled={disabled || desde === 0}
          onClick={() => onPageChange(Math.max(0, desde - limite))}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={disabled || count < limite}
          onClick={() => onPageChange(desde + limite)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
export function TableState({
  loading,
  error,
  length,
  emptyMessage = 'Sin registros para mostrar.',
}) {
  if (loading) return <LoadingIndicator label="Consultando información en Oracle XE…" />;
  if (error)
    return (
      <div className="data-placeholder">
        No se pueden mostrar los resultados. Utiliza «Reintentar».
      </div>
    );
  if (!length) return <div className="data-placeholder">{emptyMessage}</div>;
  return null;
}
export function StatusLabel({ active }) {
  return (
    <span className={`data-tag ${active ? 'data-tag--ok' : 'data-tag--muted'}`}>
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}
export function Field({ label, name, value, onChange, children, ...inputProps }) {
  if (inputProps.readOnly) return <ReadOnlyField label={label} value={value} />;
  return (
    <label className="data-field">
      <span>{label}</span>
      {children || (
        <input
          name={name}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          {...inputProps}
        />
      )}
    </label>
  );
}
/** Valor no modificable: estilo, icono y texto idénticos en todos los módulos. */
export function ReadOnlyField({ label, value, wide = false, compact = false }) {
  return (
    <div
      className={`sigfar-readonly-field ${wide ? 'data-field--wide' : ''} ${compact ? 'sigfar-readonly-field--compact' : ''}`}
      role="group"
      aria-label={`${label}, solo lectura`}
    >
      <span className="sigfar-readonly-label">{label}</span>
      <div className="sigfar-readonly-value">
        <span>{value === '' || value === null || value === undefined ? '—' : value}</span>
        <span className="sigfar-readonly-mark">
          <Icon name="lock" size={13} /> Solo lectura
        </span>
      </div>
    </div>
  );
}
export function ReadOnlyNotice() {
  return (
    <div className="sigfar-readonly-notice">
      <Icon name="lock" size={16} />
      <span>
        Los datos mostrados son de solo lectura. Las acciones autorizadas se realizan mediante los
        botones disponibles.
      </span>
    </div>
  );
}
export function DataPanel({
  title,
  subtitle,
  children,
  onClose,
  readOnly = false,
  locked = false,
}) {
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} locked={locked}>
      {readOnly && <ReadOnlyNotice />}
      {children}
    </Modal>
  );
}

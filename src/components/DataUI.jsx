import { Icon } from './Icon.jsx';

export function PageHeading({ eyebrow, title, description, action }) {
  return <header className="data-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="data-heading-action">{action}</div>}</header>;
}
export function ErrorNotice({ message, retry }) {
  if (!message) return null;
  return <div role="alert" className="data-message data-message--error"><Icon name="alert" size={18}/><span>{message}</span>{retry && <button type="button" className="text-action" onClick={retry}>Reintentar</button>}</div>;
}
export function SuccessNotice({ message, onClose }) {
  if (!message) return null;
  return <div role="status" className="data-message data-message--success"><Icon name="check" size={18}/><span>{message}</span>{onClose && <button type="button" className="text-action" onClick={onClose}>Cerrar</button>}</div>;
}
export function Pager({ desde, limite, count, onPageChange, disabled = false }) {
  return <div className="pager"><span>Registros {count ? `${desde + 1}–${desde + count}` : '0'} · Sin conteo total de la API</span><div><button type="button" disabled={disabled || desde === 0} onClick={() => onPageChange(Math.max(0, desde - limite))}>Anterior</button><button type="button" disabled={disabled || count < limite} onClick={() => onPageChange(desde + limite)}>Siguiente</button></div></div>;
}
export function TableState({ loading, error, length, emptyMessage = 'Sin registros para mostrar.' }) {
  if (loading) return <div className="data-placeholder" role="status">Consultando Oracle XE a través de la API…</div>;
  if (error) return <div className="data-placeholder">No se pueden mostrar los resultados. Utiliza «Reintentar».</div>;
  if (!length) return <div className="data-placeholder">{emptyMessage}</div>;
  return null;
}
export function StatusLabel({ active }) { return <span className={`data-tag ${active ? 'data-tag--ok' : 'data-tag--muted'}`}>{active ? 'Activa' : 'Inactiva'}</span>; }
export function Field({ label, name, value, onChange, children, ...inputProps }) {
  return <label className="data-field"><span>{label}</span>{children || <input name={name} value={value ?? ''} onChange={e => onChange(name, e.target.value)} {...inputProps}/>}</label>;
}
export function DataPanel({ title, subtitle, children, onClose }) {
  return <section className="data-panel" aria-label={title}><div className="data-panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={onClose}><Icon name="close" size={20}/></button></div>{children}</section>;
}

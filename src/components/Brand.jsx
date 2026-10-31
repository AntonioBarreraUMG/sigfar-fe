export function Brand({ inverted = false }) {
  return <div className={`brand ${inverted ? 'brand--inverted' : ''}`}>
    <span className="brand-mark" aria-hidden="true"><span className="brand-cross" /></span>
    <span className="brand-type"><strong>SIGFAR</strong><small>Sistema de farmacias</small></span>
  </div>;
}

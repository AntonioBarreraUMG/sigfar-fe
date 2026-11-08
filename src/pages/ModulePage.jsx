import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';

export function ModulePage({ modulo }) {
  return <div className="page-stack">
    <div className="eyebrow">ÁREA DE TRABAJO</div>
    <div className="module-unavailable">
      <div className="unavailable-illustration"><div className="unavailable-icon"><Icon name={modulo.icono} size={38}/></div><span className="unavailable-orbit unavailable-orbit--one"/><span className="unavailable-orbit unavailable-orbit--two"/></div>
      <span className="unavailable-label"><Icon name="info" size={15}/> Sección no disponible</span>
      <h1>{modulo.nombre}</h1>
      <p>No fue posible abrir esta sección. Vuelve al inicio para seleccionar otra área de trabajo.</p>
      <Link className="button button--primary" to="/"><Icon name="arrowRight" size={17}/> Volver al resumen</Link>
    </div>
    <div className="inline-tip"><Icon name="shield" size={19}/><span>Si el inconveniente persiste, comunícate con el administrador del sistema.</span></div>
  </div>;
}

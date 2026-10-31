import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';

export function ModulePage({ modulo }) {
  return <div className="page-stack">
    <div className="eyebrow">ÁREA DE TRABAJO / ETAPA {modulo.etapa}</div>
    <div className="module-pending">
      <div className="pending-illustration"><div className="pending-icon"><Icon name={modulo.icono} size={38}/></div><span className="pending-orbit pending-orbit--one"/><span className="pending-orbit pending-orbit--two"/></div>
      <span className="pending-label"><Icon name="clock" size={15}/> Interfaz pendiente de desarrollo</span>
      <h1>{modulo.nombre}</h1>
      <p>{modulo.descripcion} La funcionalidad de negocio ya existe en el backend validado, pero esta pantalla se implementará durante la etapa {modulo.etapa} del frontend.</p>
      <Link className="button button--primary" to="/"><Icon name="arrowRight" size={17}/> Volver al resumen</Link>
    </div>
    <div className="inline-tip"><Icon name="shield" size={19}/><span>No se muestran datos simulados ni se realizan cambios en Oracle desde esta pantalla de preparación.</span></div>
  </div>;
}

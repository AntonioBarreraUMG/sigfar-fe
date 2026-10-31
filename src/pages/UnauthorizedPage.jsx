import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';
export function UnauthorizedPage() {
  return <div className="error-page"><div className="error-page-icon"><Icon name="shield" size={34}/></div><span className="eyebrow">ACCESO RESTRINGIDO</span><h1>No tienes permiso para esta sección</h1><p>Tu rol no está autorizado a abrir este módulo. SIGFAR aplica los permisos también en el backend.</p><Link to="/" className="button button--primary">Volver al inicio <Icon name="arrowRight" size={17}/></Link></div>;
}

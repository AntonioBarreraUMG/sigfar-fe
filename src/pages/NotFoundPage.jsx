import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';
export function NotFoundPage() {
  return (
    <div className="error-page">
      <div className="error-page-icon">
        <Icon name="info" size={34} />
      </div>
      <span className="eyebrow">404 · NO ENCONTRADA</span>
      <h1>Esta página no existe</h1>
      <p>La dirección solicitada no corresponde a una sección de SIGFAR.</p>
      <Link className="button button--primary" to="/">
        Volver al inicio <Icon name="arrowRight" size={17} />
      </Link>
    </div>
  );
}

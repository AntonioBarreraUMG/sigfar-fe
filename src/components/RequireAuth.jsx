import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LoadingScreen } from './LoadingScreen.jsx';
import { Icon } from './Icon.jsx';

export function RequireAuth({ children }) {
  const { estado, mensaje, cerrarSesion, verificarSesion } = useAuth();
  const location = useLocation();
  if (estado === 'comprobando') return <LoadingScreen />;
  if (estado === 'sin_conexion') return <main className="center-screen" role="alert">
    <div className="notice-icon"><Icon name="alert" size={28}/></div>
    <h1>Sin conexión con SIGFAR</h1>
    <p className="muted centered">{mensaje || 'No fue posible comprobar la sesión.'}</p>
    <div className="button-row"><button className="button button--primary" onClick={() => verificarSesion()}><Icon name="refresh" size={17}/> Reintentar</button>
    <button className="button button--secondary" onClick={cerrarSesion}>Volver al acceso</button></div>
  </main>;
  if (estado !== 'autenticado') return <Navigate to="/acceso" replace state={{ from: location.pathname }} />;
  return children;
}

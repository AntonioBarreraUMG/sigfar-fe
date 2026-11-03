import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/Icon.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { healthApi } from '../services/healthApi.js';
import { modulosPorRol, nombreRol } from '../utils/access.js';

export function HomePage() {
  const { usuario, api } = useAuth();
  const [estadoApi, setEstadoApi] = useState('consultando');
  const modulos = modulosPorRol(usuario.rol);

  useEffect(() => {
    const abort = new AbortController();
    setEstadoApi('consultando');
    healthApi(api, abort.signal).then(activo => {
      if (!abort.signal.aborted) setEstadoApi(activo ? 'disponible' : 'error');
    }).catch(() => { if (!abort.signal.aborted) setEstadoApi('error'); });
    return () => abort.abort();
  }, [api]);

  return <div className="page-stack">
    <div className="welcome-strip"><span className="welcome-dot"/> ENTORNO DE DEMOSTRACIÓN · FRONTEND ACTUALIZADO</div>
    <section className="hero-panel">
      <div className="hero-copy">
        <div className="eyebrow eyebrow--light">PANEL DE INICIO</div>
        <h1>Bienvenido a SIGFAR,<br/><span>{usuario.nombre.split(' ')[0]}.</span></h1>
        <p>Tu espacio de trabajo para la gestión centralizada de farmacias. La base de datos y el backend ya han sido validados; los nueve módulos del sistema ya cuentan con interfaz y utilizan los servicios existentes del backend.</p>
        <span className="hero-role"><Icon name="shield" size={17}/>{nombreRol(usuario.rol)}</span>
      </div>
      <div className="hero-pattern" aria-hidden="true"><span>+</span><span>+</span><span>+</span></div>
    </section>
    <section className="metrics-row" aria-label="Estado actual del sistema">
      <div className="metric-card"><span className="metric-icon metric-icon--mint"><Icon name="check" size={21}/></span><div><strong>Sesión verificada</strong><small>Identidad confirmada por /auth/me</small></div></div>
      <div className="metric-card"><span className="metric-icon metric-icon--blue"><Icon name="grid" size={21}/></span><div><strong>{modulos.length} módulos accesibles</strong><small>Según permisos de tu usuario</small></div></div>
      <div className="metric-card"><span className={`metric-icon ${estadoApi === 'disponible' ? 'metric-icon--mint' : 'metric-icon--amber'}`}><Icon name={estadoApi === 'disponible' ? 'activity' : 'alert'} size={21}/></span><div><strong>{estadoApi === 'disponible' ? 'API HTTP operativa' : estadoApi === 'consultando' ? <LoadingIndicator inline label="Comprobando API…"/> : 'API sin respuesta'}</strong><small>Verificación mediante /api/v1/health</small></div></div>
    </section>
    <section className="modules-section" aria-labelledby="modules-heading">
      <div className="section-heading"><div><div className="eyebrow">ÁREAS DE TRABAJO</div><h2 id="modules-heading">Módulos disponibles para tu rol</h2><p>Las áreas funcionales de tu rol ya están integradas con el backend.</p></div><span className="section-count">{modulos.length} áreas</span></div>
      <div className="module-grid">
        {modulos.map((modulo, i) => <Link to={modulo.ruta} className="module-card" key={modulo.id}>
          <div className="module-top"><span className={`module-icon module-icon--${i % 4}`}><Icon name={modulo.icono} size={24}/></span><span className="module-arrow"><Icon name="arrowRight" size={18}/></span></div>
          <h3>{modulo.nombre}</h3><p>{modulo.descripcion}</p><span className="module-status"><span className="status-dot"/>{modulo.etapa <= 6 ? 'Interfaz operativa' : `Pendiente · Etapa ${modulo.etapa}`}</span>
        </Link>)}
      </div>
    </section>
    <div className="inline-tip"><Icon name="info" size={19}/><span>El frontend permite acceder a las funciones autorizadas del backend validado. Las pruebas integrales de navegador y el despliegue en la nube corresponden a las próximas etapas.</span></div>
  </div>;
}

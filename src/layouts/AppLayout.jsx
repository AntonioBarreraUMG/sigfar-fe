import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Brand } from '../components/Brand.jsx';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { modulosPorRol, nombreRol } from '../utils/access.js';

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const modulos = modulosPorRol(usuario.rol);
  const nombre = location.pathname === '/' ? 'Resumen general' : modulos.find(m => m.ruta === location.pathname)?.nombre || 'SIGFAR';
  const iniciales = usuario.nombre.trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0)).join('').toUpperCase();
  function salir() { cerrarSesion(); navigate('/acceso', { replace: true }); }
  return <div className="app-shell">
    {menuAbierto && <button type="button" className="sidebar-overlay" aria-label="Cerrar menú lateral" onClick={() => setMenuAbierto(false)} />}
    <aside className={`sidebar ${menuAbierto ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
      <div className="sidebar-header"><Brand inverted /></div>
      <div className="sidebar-content">
        <p className="nav-caption">ESPACIO DE TRABAJO</p>
        <nav aria-label="Secciones de SIGFAR">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`} onClick={() => setMenuAbierto(false)}>
            <Icon name="grid" size={19}/><span>Inicio</span>
          </NavLink>
          <p className="nav-caption nav-caption--section">MÓDULOS DEL SISTEMA</p>
          {modulos.map(modulo => <NavLink key={modulo.id} to={modulo.ruta}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            onClick={() => setMenuAbierto(false)}>
            <Icon name={modulo.icono} size={19}/><span>{modulo.nombre}</span>
          </NavLink>)}
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><Icon name="shield" size={17}/><span>Acceso protegido<br/><strong>Permisos según tu rol</strong></span></div>
        <button className="sidebar-logout" type="button" onClick={salir}><Icon name="logout" size={18}/> Cerrar sesión</button>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu" type="button" aria-label="Abrir menú" aria-expanded={menuAbierto} onClick={() => setMenuAbierto(v => !v)}><Icon name="menu" size={22}/></button>
          <span className="breadcrumb">SIGFAR</span><Icon name="chevronRight" size={15} className="breadcrumb-separator"/><span className="breadcrumb-current">{nombre}</span>
        </div>
        <div className="topbar-right">
          <span className="profile-avatar" aria-hidden="true">{iniciales || 'SF'}</span>
          <span className="profile-name">{usuario.nombre.split(' ')[0]}<small>{nombreRol(usuario.rol)}</small></span>
        </div>
      </header>
      <main className="main-content" id="contenido"><Outlet /></main>
      <footer className="app-footer">SIGFAR · Sistema Integral de Gestión de Farmacias</footer>
    </div>
  </div>;
}

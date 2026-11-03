import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Brand } from '../components/Brand.jsx';
import { LoadingIndicator } from '../components/LoadingIndicator.jsx';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export function LoginPage() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    setError('');
    if (!correo.trim() || !clave) { setError('Introduce tu correo y contraseña.'); return; }
    setEnviando(true);
    try {
      await iniciarSesion(correo, clave);
      navigate('/', { replace: true });
    } catch (err) { setError(err?.message || 'No se pudo iniciar sesión.'); }
    finally { setEnviando(false); }
  }

  return <main className="login-layout">
    <section className="login-showcase" aria-label="Introducción a SIGFAR">
      <div className="showcase-inner">
        <Brand inverted />
        <div className="showcase-message">
          <div className="showcase-kicker"><span className="kicker-dot"/> GESTIÓN FARMACÉUTICA CENTRALIZADA</div>
          <h1>Una sola vista.<br/><em>Cada sucursal</em><br/>bajo control.</h1>
          <p>Inventarios, operaciones, entregas y auditoría en un mismo sistema.</p>
          <div className="showcase-visual" aria-hidden="true">
            <div className="showcase-card showcase-card--one"><span className="visual-icon"><Icon name="store" size={22}/></span><span>Sucursales<small>Control distribuido</small></span><Icon name="check" size={18}/></div>
            <div className="showcase-card showcase-card--two"><span className="visual-icon"><Icon name="boxes" size={22}/></span><span>Inventarios<small>Información centralizada</small></span><Icon name="check" size={18}/></div>
            <div className="showcase-card showcase-card--three"><span className="visual-icon"><Icon name="shield" size={22}/></span><span>Auditoría<small>Operaciones trazables</small></span><Icon name="check" size={18}/></div>
          </div>
        </div>
        <p className="showcase-footer">SIGFAR · Proyecto académico de Ingeniería en Sistemas</p>
      </div>
    </section>
    <section className="login-panel" aria-labelledby="login-heading">
      <div className="login-card">
        <div className="mobile-brand"><Brand /></div>
        <span className="eyebrow">BIENVENIDO DE NUEVO</span>
        <h2 id="login-heading">Accede a SIGFAR</h2>
        <p className="login-subtitle">Ingresa tus credenciales para acceder al sistema según tu rol.</p>
        <form onSubmit={enviar} noValidate>
          <div className="form-field">
            <label htmlFor="correo">Correo electrónico</label>
            <input id="correo" name="correo" type="email" autoComplete="username" inputMode="email" maxLength="150" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="usuario@sigfar.test" required disabled={enviando} />
          </div>
          <div className="form-field">
            <label htmlFor="clave">Contraseña</label>
            <div className="password-field">
              <input id="clave" name="clave" type={mostrarClave ? 'text' : 'password'} autoComplete="current-password" maxLength="256" value={clave} onChange={e => setClave(e.target.value)} placeholder="Ingresa tu contraseña" required disabled={enviando} />
              <button type="button" className="password-toggle" aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setMostrarClave(v => !v)} disabled={enviando}><Icon name={mostrarClave ? 'eyeOff' : 'eye'} size={19}/></button>
            </div>
          </div>
          {error && <div className="form-error" role="alert"><Icon name="alert" size={18}/><span>{error}</span></div>}
          <button className="button button--primary login-submit" disabled={enviando} type="submit">{enviando ? <LoadingIndicator inline label="Verificando credenciales…"/> : 'Iniciar sesión'}{!enviando && <Icon name="arrowRight" size={19}/>}</button>
        </form>
        <div className="login-help"><Icon name="lock" size={18}/><span>Acceso exclusivo para usuarios autorizados. Las credenciales de Oracle permanecen en el servidor.</span></div>
      </div>
      <p className="login-panel-footer">Sistema Integral de Gestión de Farmacias · Prototipo académico</p>
    </section>
  </main>;
}

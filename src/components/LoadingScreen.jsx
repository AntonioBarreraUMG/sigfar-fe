import { Brand } from './Brand.jsx';
export function LoadingScreen({ mensaje = 'Comprobando tu sesión…' }) {
  return <main className="center-screen" role="status" aria-live="polite">
    <Brand />
    <div className="loader" aria-hidden="true" />
    <p className="muted">{mensaje}</p>
  </main>;
}

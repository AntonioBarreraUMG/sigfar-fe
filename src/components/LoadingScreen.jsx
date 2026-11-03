import { Brand } from './Brand.jsx';
import { LoadingIndicator } from './LoadingIndicator.jsx';
export function LoadingScreen({ mensaje = 'Comprobando tu sesión…' }) {
  return <main className="center-screen" role="status" aria-live="polite">
    <Brand />
    <LoadingIndicator label={mensaje}/>
  </main>;
}

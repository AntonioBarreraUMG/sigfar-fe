import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import { RequireAuth } from '../components/RequireAuth.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { ModulePage } from '../pages/ModulePage.jsx';
import { UnauthorizedPage } from '../pages/UnauthorizedPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { MODULOS, puedeAcceder } from '../utils/access.js';

function PublicLogin() {
  const { estado } = useAuth();
  if (estado === 'comprobando') return <LoadingScreen />;
  return estado === 'autenticado' ? <Navigate to="/" replace /> : <LoginPage />;
}
function AllowedModule({ modulo }) {
  const { usuario } = useAuth();
  return puedeAcceder(usuario?.rol, modulo) ? <ModulePage modulo={modulo} /> : <UnauthorizedPage />;
}

export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/acceso" element={<PublicLogin />} />
    <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
      <Route index element={<HomePage />} />
      {MODULOS.map(modulo => <Route key={modulo.id} path={modulo.ruta.slice(1)} element={<AllowedModule modulo={modulo} />} />)}
      <Route path="/sin-acceso" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}

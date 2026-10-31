import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext.jsx';
import { RequireAuth } from '../components/RequireAuth.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { ModulePage } from '../pages/ModulePage.jsx';
import { SucursalesPage } from '../pages/SucursalesPage.jsx';
import { MedicamentosPage } from '../pages/MedicamentosPage.jsx';
import { InventariosPage } from '../pages/InventariosPage.jsx';
import { TransferenciasPage } from '../pages/TransferenciasPage.jsx';
import { EfectivoPage } from '../pages/EfectivoPage.jsx';
import { PlanillasPage } from '../pages/PlanillasPage.jsx';
import { ActivosPage } from '../pages/ActivosPage.jsx';
import { UnauthorizedPage } from '../pages/UnauthorizedPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { MODULOS, puedeAcceder } from '../utils/access.js';

function PublicLogin() {
  const { estado } = useAuth();
  if (estado === 'comprobando') return <LoadingScreen />;
  return estado === 'autenticado' ? <Navigate to="/" replace /> : <LoginPage />;
}
const IMPLEMENTADOS = Object.freeze({ sucursales: SucursalesPage, medicamentos: MedicamentosPage, inventarios: InventariosPage, transferencias: TransferenciasPage, efectivo: EfectivoPage, planillas: PlanillasPage, activos: ActivosPage });
function AllowedModule({ modulo }) {
  const { usuario } = useAuth();
  if (!puedeAcceder(usuario?.rol, modulo)) return <UnauthorizedPage />;
  const Pantalla = IMPLEMENTADOS[modulo.id];
  return Pantalla ? <Pantalla /> : <ModulePage modulo={modulo} />;
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

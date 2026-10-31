// Los roles y módulos provienen de src/utils/authorization.js y src/app.js del backend SIGFAR v1.4.
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN_CENTRAL',
  ENCARGADO: 'ENCARGADO',
  COORD: 'COORD_ENTREGAS'
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Administrador central',
  [ROLES.ENCARGADO]: 'Encargado de sucursal',
  [ROLES.COORD]: 'Coordinador de entregas'
});

const TODOS = [ROLES.ADMIN, ROLES.ENCARGADO, ROLES.COORD];
const GESTION = [ROLES.ADMIN, ROLES.ENCARGADO];

export const MODULOS = Object.freeze([
  { id: 'sucursales', nombre: 'Sucursales', ruta: '/sucursales', icono: 'store', roles: TODOS, etapa: 2, descripcion: 'Puntos de venta y ubicaciones.' },
  { id: 'medicamentos', nombre: 'Medicamentos', ruta: '/medicamentos', icono: 'pill', roles: TODOS, etapa: 2, descripcion: 'Catálogo de medicamentos.' },
  { id: 'inventarios', nombre: 'Inventarios', ruta: '/inventarios', icono: 'boxes', roles: TODOS, etapa: 2, descripcion: 'Existencias y disponibilidad por sucursal.' },
  { id: 'transferencias', nombre: 'Transferencias', ruta: '/transferencias', icono: 'arrows', roles: GESTION, etapa: 3, descripcion: 'Movimientos entre sucursales.' },
  { id: 'efectivo', nombre: 'Efectivo', ruta: '/efectivo', icono: 'wallet', roles: GESTION, etapa: 4, descripcion: 'Ingresos, egresos y flujo neto.' },
  { id: 'planillas', nombre: 'Planillas', ruta: '/planillas', icono: 'receipt', roles: GESTION, etapa: 4, descripcion: 'Gastos por sucursal y período.' },
  { id: 'activos', nombre: 'Activos fijos', ruta: '/activos', icono: 'briefcase', roles: GESTION, etapa: 4, descripcion: 'Registro y valoración de activos.' },
  { id: 'solicitudes', nombre: 'Solicitudes y entregas', ruta: '/solicitudes', icono: 'truck', roles: TODOS, etapa: 5, descripcion: 'Disponibilidad y coordinación de entregas.' },
  { id: 'auditoria', nombre: 'Auditoría', ruta: '/auditoria', icono: 'shield', roles: [ROLES.ADMIN], etapa: 6, descripcion: 'Trazabilidad centralizada de operaciones.' }
]);

export function modulosPorRol(rol) {
  return MODULOS.filter(modulo => modulo.roles.includes(rol));
}

export function puedeAcceder(rol, modulo) {
  return Boolean(modulo && modulo.roles.includes(rol));
}

export function nombreRol(rol) {
  return ROLE_LABELS[rol] || 'Rol no reconocido';
}

export function usuarioValido(usuario) {
  return usuario && Number.isSafeInteger(usuario.id_usuario) && usuario.id_usuario > 0 &&
    typeof usuario.nombre === 'string' && typeof usuario.correo === 'string' &&
    Object.values(ROLES).includes(usuario.rol);
}

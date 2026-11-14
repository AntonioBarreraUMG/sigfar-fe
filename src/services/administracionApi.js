// Contratos exactos de /src/routes/{efectivo,planillas,activos}.routes.js del backend SIGFAR v1.4.
import { PAGE_LIMIT, queryParams } from './catalogosApi.js';

const MODULOS = Object.freeze({
  efectivo: {
    lista: '/efectivo/movimientos',
    resumen: '/efectivo/resumen',
    detalle: '/efectivo/movimientos',
  },
  planillas: { lista: '/planillas', resumen: '/planillas/resumen', detalle: '/planillas' },
  activos: { lista: '/activos', resumen: '/activos/resumen', detalle: '/activos' },
});

function rutas(modulo) {
  if (!Object.hasOwn(MODULOS, modulo)) throw new Error('Módulo administrativo no permitido.');
  return MODULOS[modulo];
}

export function listAdministracionApi(
  api,
  modulo,
  filtros = {},
  { desde = 0, limite = PAGE_LIMIT, signal } = {},
) {
  const path = rutas(modulo).lista;
  const query = queryParams({ ...filtros, desde, limite });
  return api(`${path}?${query}`, { signal }).then((result) => result.datos);
}

export function resumenAdministracionApi(api, modulo, filtros = {}, { signal } = {}) {
  const path = rutas(modulo).resumen;
  const query = queryParams(filtros);
  return api(`${path}${query ? `?${query}` : ''}`, { signal });
}

export function detalleAdministracionApi(api, modulo, id, { signal } = {}) {
  const path = rutas(modulo).detalle;
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('Identificador incorrecto.');
  return api(`${path}/${id}`, { signal }).then((result) => result.datos);
}

export function registrarEfectivoApi(api, body) {
  return api('/efectivo/movimientos', { method: 'POST', body }).then((result) => result.datos);
}
export function registrarPlanillaApi(api, body) {
  return api('/planillas', { method: 'POST', body }).then((result) => result.datos);
}
export function corregirPlanillaApi(api, id, body) {
  return api(`${rutas('planillas').detalle}/${id}`, { method: 'PATCH', body }).then(
    (result) => result.datos,
  );
}
export function registrarActivoApi(api, body) {
  return api('/activos', { method: 'POST', body }).then((result) => result.datos);
}
export function actualizarActivoApi(api, id, body) {
  return api(`${rutas('activos').detalle}/${id}`, { method: 'PATCH', body }).then(
    (result) => result.datos,
  );
}

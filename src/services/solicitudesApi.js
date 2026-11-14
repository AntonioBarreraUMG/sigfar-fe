// Contratos de SIGFAR Backend v1.4: solicitudes.routes.js
import { PAGE_LIMIT, queryParams } from './catalogosApi.js';

export function listSolicitudesApi(
  api,
  filters = {},
  { desde = 0, limite = PAGE_LIMIT, signal } = {},
) {
  const query = queryParams({
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.id_sucursal ? { id_sucursal: filters.id_sucursal } : {}),
    desde,
    limite,
  });
  return api(`/solicitudes?${query}`, { signal }).then((result) => result.datos);
}

export function getSolicitudApi(api, id, { signal } = {}) {
  return api(`/solicitudes/${id}`, { signal }).then((result) => result.datos);
}

export function disponibilidadApi(api, values, { signal } = {}) {
  return api('/solicitudes/disponibilidad', { method: 'POST', body: values, signal }).then(
    (result) => result.datos,
  );
}

export function createSolicitudApi(api, values) {
  return api('/solicitudes', { method: 'POST', body: values }).then((result) => result.datos);
}

export function opcionesSolicitudApi(api, id, { signal } = {}) {
  return api(`/solicitudes/${id}/opciones`, { signal }).then((result) => result.datos);
}

export function confirmarSolicitudApi(api, id, values) {
  return api(`/solicitudes/${id}/confirmar`, { method: 'POST', body: values }).then(
    (result) => result.datos,
  );
}

// El backend valida explícitamente que estos tres POST no lleven un cuerpo JSON.
export function despacharSolicitudApi(api, id) {
  return api(`/solicitudes/${id}/despachar`, { method: 'POST' }).then((result) => result.datos);
}
export function entregarSolicitudApi(api, id) {
  return api(`/solicitudes/${id}/entregar`, { method: 'POST' }).then((result) => result.datos);
}
export function cancelarSolicitudApi(api, id) {
  return api(`/solicitudes/${id}/cancelar`, { method: 'POST' }).then((result) => result.datos);
}

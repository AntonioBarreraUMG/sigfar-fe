// API de transferencias, conforme al backend SIGFAR v1.4.
import { PAGE_LIMIT, queryParams } from './catalogosApi.js';

export function listTransferenciasApi(api, filters = {}, { desde = 0, limite = PAGE_LIMIT, signal } = {}) {
  const query = queryParams({
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.id_sucursal ? { id_sucursal: filters.id_sucursal } : {}),
    desde, limite
  });
  return api(`/transferencias?${query}`, { signal }).then(result => result.datos);
}

export function getTransferenciaApi(api, id, { signal } = {}) {
  return api(`/transferencias/${id}`, { signal }).then(result => result.datos);
}

export function createTransferenciaApi(api, values) {
  return api('/transferencias', { method: 'POST', body: values }).then(result => result.datos);
}

// El backend requiere explícitamente una petición sin campos JSON.
export function dispatchTransferenciaApi(api, id) {
  return api(`/transferencias/${id}/despachar`, { method: 'POST' }).then(result => result.datos);
}

export function receiveTransferenciaApi(api, id) {
  return api(`/transferencias/${id}/recibir`, { method: 'POST' }).then(result => result.datos);
}

// SIGFAR Backend v1.4: src/routes/auditoria.routes.js
// API exclusivamente de lectura; únicamente ADMIN_CENTRAL puede consultarla.
import { queryParams } from './catalogosApi.js';

export const LIMITE_AUDITORIA = 20;

export function listarAuditoriaApi(api, filtros = {}, { desde = 0, limite = LIMITE_AUDITORIA, signal } = {}) {
  const query = queryParams({ ...filtros, desde, limite });
  return api(`/auditoria/registros?${query}`, { signal }); // { datos, total, paginacion }
}

export function resumenAuditoriaApi(api, filtros = {}, { signal } = {}) {
  const query = queryParams(filtros);
  return api(`/auditoria/resumen${query ? `?${query}` : ''}`, { signal }).then(r => r.datos);
}

export function detalleAuditoriaApi(api, id, { signal } = {}) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) {
    throw new Error('Identificador de auditoría inválido.');
  }
  return api(`/auditoria/registros/${id}`, { signal }).then(r => r.datos);
}

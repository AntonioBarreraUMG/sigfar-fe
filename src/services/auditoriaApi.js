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

// Catálogos derivados de la bitácora real, con acceso exclusivo a ADMIN_CENTRAL.
export function opcionesFiltrosAuditoriaApi(api, { signal } = {}) {
  return api('/auditoria/opciones-filtros', { signal }).then(r => r.datos);
}

export async function opcionesRegistrosAuditoriaApi(api, entidad, { signal, maxPages = 20 } = {}) {
  if (!entidad) return [];
  const todos = [];
  for (let pagina = 0; pagina < maxPages; pagina++) {
    const query = queryParams({ entidad, desde: pagina * 100, limite: 100 });
    const result = await api(`/auditoria/opciones-registros?${query}`, { signal });
    if (!Array.isArray(result.datos)) throw new Error('Respuesta inválida para opciones de registros.');
    todos.push(...result.datos);
    if (result.datos.length < 100) return todos;
  }
  throw new Error('La entidad tiene demasiados registros para una lista única. Utiliza otros filtros o consulta la página del historial.');
}

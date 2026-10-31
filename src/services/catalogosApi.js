// Contratos comprobados con las rutas reales de SIGFAR Backend v1.4.
export const PAGE_LIMIT = 20;
const asPath = (resource, id = '') => `/${resource}${id ? `/${id}` : ''}`;

export function queryParams(values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export function listApi(api, resource, filters = {}, { desde = 0, limite = PAGE_LIMIT, signal } = {}) {
  if (!['sucursales', 'medicamentos', 'inventarios'].includes(resource)) throw new Error('Recurso no autorizado.');
  const query = queryParams({ ...filters, desde, limite });
  return api(`${asPath(resource)}?${query}`, { signal }).then(result => result.datos);
}

export function listMovimientosApi(api, filters = {}, opts = {}) {
  const query = queryParams({ ...filters, desde: opts.desde ?? 0, limite: opts.limite ?? PAGE_LIMIT });
  return api(`/inventarios/movimientos?${query}`, { signal: opts.signal }).then(result => result.datos);
}

export function saveCatalogoApi(api, resource, values, id = null) {
  if (!['sucursales', 'medicamentos'].includes(resource)) throw new Error('Recurso no autorizado.');
  return api(asPath(resource, id), { method: id ? 'PATCH' : 'POST', body: values }).then(result => result.datos);
}

export function createMovimientoApi(api, values) {
  return api('/inventarios/movimientos', { method: 'POST', body: values }).then(result => result.datos);
}

// Catálogos de selección paginados. El endpoint no incluye total general de registros.
// Límite explícito para que la interfaz no dispare consultas infinitas.
export async function listOpcionesApi(api, resource, { signal, maxPages = 20 } = {}) {
  const rows = [];
  for (let page = 0; page < maxPages; page++) {
    const list = await listApi(api, resource, {}, { desde: page * 100, limite: 100, signal });
    rows.push(...list);
    if (list.length < 100) return rows;
  }
  // No ocultamos silenciosamente opciones si se superó el máximo de consulta.
  throw new Error('El catálogo supera el límite de carga de opciones de esta versión. Consulta por página.');
}

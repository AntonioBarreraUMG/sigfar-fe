import { PAGE_LIMIT, queryParams, listOpcionesApi } from './catalogosApi.js';

function idValido(id) {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('ID de usuario inválido.');
  return id;
}

export function listarUsuariosApi(api, filtros = {}, { desde = 0, limite = PAGE_LIMIT, signal } = {}) {
  const query = queryParams({ ...filtros, desde, limite });
  return api(`/usuarios?${query}`, { signal }).then(response => response.datos);
}
export function crearUsuarioApi(api, body) {
  return api('/usuarios', { method: 'POST', body }).then(response => response.datos);
}
export function modificarUsuarioApi(api, id, body) {
  return api(`/usuarios/${idValido(id)}`, { method: 'PATCH', body }).then(response => response.datos);
}
export function restablecerClaveApi(api, id, clave_nueva) {
  return api(`/usuarios/${idValido(id)}/restablecer-clave`, { method: 'POST', body: { clave_nueva } });
}
export function sucursalesParaUsuariosApi(api, { signal } = {}) {
  return listOpcionesApi(api, 'sucursales', { signal });
}

import { ApiError } from './http.js';
import { usuarioValido } from '../utils/access.js';

export async function loginApi(request, { correo, clave }) {
  const data = await request('/auth/login', {
    method: 'POST', body: { correo: correo.trim().toLowerCase(), clave }, authorized: false
  });
  if (typeof data?.token !== 'string' || !data.token || !usuarioValido(data.usuario)) {
    throw new ApiError('La respuesta de autenticación no tiene el formato esperado.', { code: 'RESPUESTA_INVALIDA' });
  }
  return { token: data.token, usuario: data.usuario };
}

export async function meApi(request, signal) {
  const data = await request('/auth/me', { signal });
  if (!usuarioValido(data?.usuario)) {
    throw new ApiError('No se pudo validar la información de la sesión.', { code: 'RESPUESTA_INVALIDA' });
  }
  return data.usuario;
}

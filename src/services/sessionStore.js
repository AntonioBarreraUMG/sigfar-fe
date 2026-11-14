const TOKEN_KEY = 'sigfar_token_v1';
// La sesión se limita a la pestaña actual. No se almacenan contraseñas ni credenciales Oracle.
export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento disponible: el estado React igualmente se limpia */
  }
}

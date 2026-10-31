export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR_RED' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function parseJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

// Cliente HTTP desacoplado de React, para reutilizarlo en los módulos de las siguientes etapas.
export function createApiClient({ fetcher = globalThis.fetch, getToken = () => null, onUnauthorized = () => {} } = {}) {
  return async function request(path, { method = 'GET', body, signal, authorized = true } = {}) {
    if (!/^\/[a-z0-9/_?=&%.-]*$/i.test(path) || path.startsWith('//')) {
      throw new Error('Ruta de API no permitida.');
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const tokenUsed = authorized ? getToken() : null;
    if (authorized && !tokenUsed) throw new ApiError('Debes iniciar sesión.', { status: 401, code: 'NO_AUTENTICADO' });
    if (tokenUsed) headers.Authorization = `Bearer ${tokenUsed}`;

    let response;
    try {
      response = await fetcher(`/api/v1${path}`, {
        method, headers, signal,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new ApiError('No fue posible conectar con el servidor. Comprueba que el backend esté ejecutándose.');
    }

    const payload = parseJson(await response.text());
    if (!response.ok) {
      const error = new ApiError(payload?.error?.mensaje || `Error HTTP ${response.status}.`, {
        status: response.status,
        code: payload?.error?.codigo || `HTTP_${response.status}`
      });
      if (authorized && response.status === 401) onUnauthorized(tokenUsed);
      throw error;
    }
    return payload;
  };
}

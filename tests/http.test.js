import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiError } from '../src/services/http.js';
import { loginApi, meApi } from '../src/services/authApi.js';
import { healthApi } from '../src/services/healthApi.js';

const user = { id_usuario: 1, nombre: 'Administrador', correo: 'admin@sigfar.test', rol: 'ADMIN_CENTRAL', id_sucursal: null };
const response = (status, json) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(json) });

test('login envía correo y clave según contrato del backend, sin token previo', async () => {
  const calls = [];
  const api = createApiClient({ fetcher: async (url, init) => {
    calls.push({ url, init });
    return response(200, { token: 'token-demo', tipo: 'Bearer', usuario: user });
  }});
  const session = await loginApi(api, { correo: ' ADMIN@SIGFAR.TEST ', clave: 'clave-prueba' });
  assert.equal(session.token, 'token-demo');
  assert.equal(session.usuario.rol, 'ADMIN_CENTRAL');
  assert.equal(calls[0].url, '/api/v1/auth/login');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { correo: 'admin@sigfar.test', clave: 'clave-prueba' });
  assert.equal(calls[0].init.headers.Authorization, undefined);
});

test('auth/me incluye token Bearer para renovar sesión', async () => {
  let authHeader;
  const api = createApiClient({ getToken: () => 'mi-token', fetcher: async (url, init) => {
    assert.equal(url, '/api/v1/auth/me'); authHeader = init.headers.Authorization;
    return response(200, { usuario: user });
  }});
  const result = await meApi(api);
  assert.equal(result.id_usuario, 1);
  assert.equal(authHeader, 'Bearer mi-token');
});

test('error 401 autenticado invoca invalidación de sesión', async () => {
  let invalidatedWith;
  const api = createApiClient({
    getToken: () => 'vencido', onUnauthorized: token => { invalidatedWith = token; },
    fetcher: async () => response(401, { error: { codigo: 'TOKEN_INVALIDO', mensaje: 'Token inválido o vencido.' } })
  });
  await assert.rejects(api('/auth/me'), err => err instanceof ApiError && err.status === 401 && err.code === 'TOKEN_INVALIDO');
  assert.equal(invalidatedWith, 'vencido');
});

test('login con credenciales incorrectas no invoca cierre de sesión', async () => {
  let invalidations = 0;
  const api = createApiClient({
    onUnauthorized: () => invalidations++,
    fetcher: async () => response(401, { error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Credenciales incorrectas.' } })
  });
  await assert.rejects(loginApi(api, { correo: 'usuario@sigfar.test', clave: 'mal' }), { status: 401 });
  assert.equal(invalidations, 0);
});

test('respuestas 403 mantienen mensaje seguro del servidor', async () => {
  const api = createApiClient({ getToken: () => 'x', fetcher: async () => response(403, { error: { codigo: 'SIN_PERMISO', mensaje: 'No tienes permiso para esta operación.' } }) });
  await assert.rejects(api('/auditoria/registros'), error => error.status === 403 && error.message.includes('permiso'));
});

test('errores de red no exponen detalles internos de la petición', async () => {
  const api = createApiClient({ getToken: () => 'x', fetcher: async () => { throw Error('ECONNREFUSED internals'); } });
  await assert.rejects(api('/auth/me'), err => err.code === 'ERROR_RED' && !err.message.includes('internals'));
});

test('peticiones sin sesión protegidas se rechazan antes de consultar el backend', async () => {
  let calls = 0;
  const api = createApiClient({ fetcher: async () => { calls++; return response(200, {}); } });
  await assert.rejects(api('/inventarios'), { status: 401 });
  assert.equal(calls, 0);
});

test('health usa ruta pública y verifica respuesta del backend', async () => {
  let url;
  const api = createApiClient({ fetcher: async u => { url = u; return response(200, { servicio: 'SIGFAR', estado: 'activo' }); } });
  assert.equal(await healthApi(api), true);
  assert.equal(url, '/api/v1/health');
});

test('las rutas API fuera del prefijo permitido se rechazan', async () => {
  const api = createApiClient({ getToken: () => 'x' });
  await assert.rejects(api('//otro-servidor/robo'));
  await assert.rejects(api('https://otro-servidor'));
});

test('si el backend responde datos de sesión incompletos, se rechazan', async () => {
  const api = createApiClient({ fetcher: async () => response(200, { token: 'x', usuario: { id_usuario: 1 } }) });
  await assert.rejects(loginApi(api, { correo: 'a@b.test', clave: 'x' }), { code: 'RESPUESTA_INVALIDA' });
});

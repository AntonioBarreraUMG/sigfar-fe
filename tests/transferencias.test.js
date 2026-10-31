import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/services/http.js';
import { ROLES, modulosPorRol } from '../src/utils/access.js';
import {
  accionPermitida, puedeCrearTransferencia, puedeConsultarDetalle,
  puedeConsultarTransferencias, transferenciaPayload, ESTADOS_TRANSFERENCIA
} from '../src/utils/transferencias.js';
import {
  listTransferenciasApi, getTransferenciaApi, createTransferenciaApi,
  dispatchTransferenciaApi, receiveTransferenciaApi
} from '../src/services/transferenciasApi.js';

const encargado1 = { rol: ROLES.ENCARGADO, id_sucursal: 1 };
const encargado2 = { rol: ROLES.ENCARGADO, id_sucursal: 2 };
const admin = { rol: ROLES.ADMIN, id_sucursal: null };
const coord = { rol: ROLES.COORD, id_sucursal: null };
const medicamentos = [
  { id_medicamento: 2, activo: 'S' },
  { id_medicamento: 4, activo: 'S' },
  { id_medicamento: 3, activo: 'N' }
];
const basico = { id_sucursal_origen: '1', id_sucursal_destino: '2', detalles: [{ id_medicamento: '4', cantidad: '3' }, { id_medicamento: '2', cantidad: '1' }] };
const res = (status = 200, payload = { datos: [] }) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) });
function mock(fetchResult = () => res()) {
  const llamadas = [];
  const api = createApiClient({ getToken: () => 'test.jwt', fetcher: async (url, options) => {
    llamadas.push({ url, options });
    return fetchResult(url, options);
  } });
  return { api, llamadas };
}

test('el coordinador no ve módulo de transferencias', () => {
  assert.equal(modulosPorRol(ROLES.COORD).some(m => m.id === 'transferencias'), false);
  assert.equal(modulosPorRol(ROLES.ADMIN).some(m => m.id === 'transferencias'), true);
  assert.equal(modulosPorRol(ROLES.ENCARGADO).some(m => m.id === 'transferencias'), true);
});
test('solo administrador y encargado pueden consultar', () => {
  assert.equal(puedeConsultarTransferencias(ROLES.ADMIN), true);
  assert.equal(puedeConsultarTransferencias(ROLES.ENCARGADO), true);
  assert.equal(puedeConsultarTransferencias(ROLES.COORD), false);
});
test('solo un encargado con sucursal asignada puede registrar', () => {
  assert.equal(puedeCrearTransferencia(encargado1), true);
  assert.equal(puedeCrearTransferencia({ rol: ROLES.ENCARGADO, id_sucursal: null }), false);
  assert.equal(puedeCrearTransferencia(admin), false);
});
test('permite leer transferencias si la sucursal participa o si es administrador', () => {
  const t = { id_sucursal_origen: 1, id_sucursal_destino: 2 };
  assert.equal(puedeConsultarDetalle(encargado1, t), true);
  assert.equal(puedeConsultarDetalle(encargado2, t), true);
  assert.equal(puedeConsultarDetalle({ rol: ROLES.ENCARGADO, id_sucursal: 3 }, t), false);
  assert.equal(puedeConsultarDetalle(admin, t), true);
  assert.equal(puedeConsultarDetalle(coord, t), false);
});
test('solo el encargado del origen despacha una registrada', () => {
  const t = { estado: 'REGISTRADA', id_sucursal_origen: 1, id_sucursal_destino: 2 };
  assert.equal(accionPermitida(encargado1, t), 'despachar');
  assert.equal(accionPermitida(encargado2, t), null);
  assert.equal(accionPermitida(admin, t), null);
});
test('solo el encargado del destino recibe una en tránsito', () => {
  const t = { estado: 'EN_TRANSITO', id_sucursal_origen: 1, id_sucursal_destino: 2 };
  assert.equal(accionPermitida(encargado1, t), null);
  assert.equal(accionPermitida(encargado2, t), 'recibir');
  assert.equal(accionPermitida(admin, t), null);
});
test('recibida ya no puede transicionar desde la interfaz', () => {
  const t = { estado: 'RECIBIDA', id_sucursal_origen: 1, id_sucursal_destino: 2 };
  for (const user of [encargado1, encargado2, admin, coord]) assert.equal(accionPermitida(user, t), null);
  assert.deepEqual(ESTADOS_TRANSFERENCIA, ['REGISTRADA', 'EN_TRANSITO', 'RECIBIDA']);
});
test('normaliza los números y ordena los medicamentos para envío', () => {
  assert.deepEqual(transferenciaPayload(basico, encargado1, medicamentos), {
    id_sucursal_origen: 1, id_sucursal_destino: 2,
    detalles: [{ id_medicamento: 2, cantidad: 1 }, { id_medicamento: 4, cantidad: 3 }]
  });
});
test('permite destino por ID incluso si no es visible en sucursales del encargado', () => {
  assert.equal(transferenciaPayload({ ...basico, id_sucursal_destino: '99' }, encargado1, medicamentos).id_sucursal_destino, 99);
});
test('bloquea suplantar origen, elegir origen como destino y origen sin asignación', () => {
  assert.throws(() => transferenciaPayload({ ...basico, id_sucursal_origen: '3' }, encargado1, medicamentos), /propia sucursal/);
  assert.throws(() => transferenciaPayload({ ...basico, id_sucursal_destino: '1' }, encargado1, medicamentos), /diferente/);
  assert.throws(() => transferenciaPayload(basico, admin, medicamentos), /Solo el encargado/);
});
test('requiere entre 1 y 50 renglones', () => {
  assert.throws(() => transferenciaPayload({ ...basico, detalles: [] }, encargado1, medicamentos), /1 y 50/);
  assert.throws(() => transferenciaPayload({ ...basico, detalles: Array.from({ length: 51 }, () => ({ id_medicamento: '2', cantidad: '1' })) }, encargado1, medicamentos), /1 y 50/);
});
test('no acepta medicamentos duplicados, inactivos ni inexistentes', () => {
  assert.throws(() => transferenciaPayload({ ...basico, detalles: [{ id_medicamento: '2', cantidad: '1' }, { id_medicamento: '2', cantidad: '2' }] }, encargado1, medicamentos), /no puede repetirse/);
  assert.throws(() => transferenciaPayload({ ...basico, detalles: [{ id_medicamento: '3', cantidad: '1' }] }, encargado1, medicamentos), /inactivo/);
  assert.throws(() => transferenciaPayload({ ...basico, detalles: [{ id_medicamento: '9', cantidad: '1' }] }, encargado1, medicamentos), /no existe/);
});
test('no acepta fracciones, números negativos ni cadenas vacías', () => {
  for (const value of ['1.5', '-4', '', '0', 'abc', '99999999999']) {
    assert.throws(() => transferenciaPayload({ ...basico, detalles: [{ id_medicamento: '2', cantidad: value }] }, encargado1, medicamentos), /Cantidad/);
  }
});
test('consulta transferencias con filtros reales y paginación', async () => {
  const { api, llamadas } = mock(() => res(200, { datos: [{ id_transferencia: 7 }] }));
  const datos = await listTransferenciasApi(api, { estado: 'EN_TRANSITO', id_sucursal: 2 }, { desde: 20 });
  assert.deepEqual(datos, [{ id_transferencia: 7 }]);
  assert.equal(llamadas[0].url, '/api/v1/transferencias?estado=EN_TRANSITO&id_sucursal=2&desde=20&limite=20');
  assert.equal(llamadas[0].options.headers.Authorization, 'Bearer test.jwt');
});
test('lista sin filtros no envía parámetros opcionales vacíos', async () => {
  const { api, llamadas } = mock();
  await listTransferenciasApi(api, { estado: '', id_sucursal: '' });
  assert.equal(llamadas[0].url, '/api/v1/transferencias?desde=0&limite=20');
});
test('consulta detalle por GET conservando respuesta {datos}', async () => {
  const { api, llamadas } = mock(() => res(200, { datos: { id_transferencia: 9, detalles: [] } }));
  assert.equal((await getTransferenciaApi(api, 9)).id_transferencia, 9);
  assert.equal(llamadas[0].url, '/api/v1/transferencias/9');
  assert.equal(llamadas[0].options.method, 'GET');
});
test('registra transferencia con estructura exacta del backend', async () => {
  const { api, llamadas } = mock(() => res(201, { datos: { id_transferencia: 10 } }));
  const payload = transferenciaPayload(basico, encargado1, medicamentos);
  assert.equal((await createTransferenciaApi(api, payload)).id_transferencia, 10);
  assert.equal(llamadas[0].url, '/api/v1/transferencias');
  assert.equal(llamadas[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(llamadas[0].options.body), payload);
});
test('despachar/recibir son POST sin cuerpo JSON', async () => {
  const { api, llamadas } = mock(() => res(200, { datos: { estado: 'EN_TRANSITO' } }));
  await dispatchTransferenciaApi(api, 12);
  await receiveTransferenciaApi(api, 12);
  assert.equal(llamadas[0].url, '/api/v1/transferencias/12/despachar');
  assert.equal(llamadas[1].url, '/api/v1/transferencias/12/recibir');
  assert.equal(llamadas[0].options.method, 'POST');
  assert.equal(llamadas[1].options.method, 'POST');
  assert.equal('body' in llamadas[0].options, false);
  assert.equal('body' in llamadas[1].options, false);
});
test('la API propaga conflictos 409 sin inventar éxito', async () => {
  const { api } = mock(() => res(409, { error: { mensaje: 'Inventario insuficiente', codigo: 'CONFLICTO' } }));
  await assert.rejects(() => dispatchTransferenciaApi(api, 12), e => e.status === 409 && /Inventario insuficiente/.test(e.message));
});
test('la API propaga acceso denegado 403 sin escribir', async () => {
  const { api } = mock(() => res(403, { error: { mensaje: 'Acceso denegado' } }));
  await assert.rejects(() => receiveTransferenciaApi(api, 12), e => e.status === 403);
});

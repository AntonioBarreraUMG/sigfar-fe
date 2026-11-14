import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/services/http.js';
import {
  PAGE_LIMIT,
  queryParams,
  listApi,
  listMovimientosApi,
  listOpcionesApi,
  saveCatalogoApi,
  createMovimientoApi,
} from '../src/services/catalogosApi.js';
import { ROLES } from '../src/utils/access.js';
import {
  aNumeroEntero,
  puedeAdministrarCatalogos,
  puedeRegistrarMovimiento,
  puedeVerMovimientos,
  medicamentoPayload,
  movimientoPayload,
  sucursalPayload,
} from '../src/utils/catalogos.js';

function response(status, payload) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}
function withMock(responseFactory) {
  const calls = [];
  const api = createApiClient({
    getToken: () => 'prueba.jwt',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return responseFactory(url, options);
    },
  });
  return { api, calls };
}

test('paginación utiliza 20 resultados por defecto y filtros definidos', async () => {
  assert.equal(PAGE_LIMIT, 20);
  const { api, calls } = withMock(() => response(200, { datos: [{ id_sucursal: 1 }] }));
  const data = await listApi(api, 'sucursales', { activa: 'S' }, { desde: 20 });
  assert.deepEqual(data, [{ id_sucursal: 1 }]);
  assert.equal(calls[0].url, '/api/v1/sucursales?activa=S&desde=20&limite=20');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer prueba.jwt');
});

test('filtros vacíos no son enviados al backend', () => {
  assert.equal(
    queryParams({ id_sucursal: '', id_medicamento: null, activo: 'S', desde: 0 }),
    'activo=S&desde=0',
  );
});

test('no es posible enviar recursos arbitrarios a la API de catálogos', async () => {
  const { api } = withMock(() => response(200, { datos: [] }));
  assert.throws(() => listApi(api, 'auditoria'), /Recurso no autorizado/);
  assert.throws(() => saveCatalogoApi(api, 'usuarios', {}), /Recurso no autorizado/);
});

test('medicamentos se crean con POST, y se modifican con PATCH, sin alterar contrato', async () => {
  const { api, calls } = withMock(() => response(201, { datos: { id_medicamento: 8 } }));
  await saveCatalogoApi(api, 'medicamentos', {
    codigo: 'ABC',
    nombre: 'Demo',
    presentacion: 'caja',
    activo: 'S',
  });
  await saveCatalogoApi(
    api,
    'medicamentos',
    { codigo: 'ABC', nombre: 'Demo 2', presentacion: 'caja', activo: 'S' },
    8,
  );
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].url, '/api/v1/medicamentos');
  assert.equal(calls[1].options.method, 'PATCH');
  assert.equal(calls[1].url, '/api/v1/medicamentos/8');
});

test('movimientos consulta ruta distinta de la escritura', async () => {
  const { api, calls } = withMock((url) =>
    url.includes('movimientos?')
      ? response(200, { datos: [] })
      : response(201, { datos: { id_movimiento: 1 } }),
  );
  await listMovimientosApi(api, { id_sucursal: 1 }, { desde: 0, limite: 20 });
  await createMovimientoApi(api, {
    id_sucursal: 1,
    id_medicamento: 2,
    tipo: 'INICIAL',
    cantidad: 2,
  });
  assert.equal(calls[0].url, '/api/v1/inventarios/movimientos?id_sucursal=1&desde=0&limite=20');
  assert.equal(calls[1].url, '/api/v1/inventarios/movimientos');
  assert.equal(calls[1].options.method, 'POST');
});

test('carga de opciones reúne varias páginas sin asumir cantidad total', async () => {
  const { api, calls } = withMock((url) =>
    response(200, {
      datos: url.includes('desde=0')
        ? Array.from({ length: 100 }, (_, i) => ({ id_medicamento: i + 1 }))
        : [{ id_medicamento: 101 }],
    }),
  );
  const lista = await listOpcionesApi(api, 'medicamentos');
  assert.equal(lista.length, 101);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /desde=100/);
});

test('carga de opciones informa cuando supera el límite, no trunca silenciosamente', async () => {
  const { api } = withMock(() =>
    response(200, { datos: Array.from({ length: 100 }, () => ({ id_sucursal: 1 })) }),
  );
  await assert.rejects(listOpcionesApi(api, 'sucursales', { maxPages: 2 }), /supera el límite/);
});

test('rol administrador es el único con permisos para modificar catálogos', () => {
  assert.equal(puedeAdministrarCatalogos(ROLES.ADMIN), true);
  assert.equal(puedeAdministrarCatalogos(ROLES.ENCARGADO), false);
  assert.equal(puedeAdministrarCatalogos(ROLES.COORD), false);
});

test('historial de inventario es exclusivo de administrador y encargado', () => {
  assert.equal(puedeVerMovimientos(ROLES.ADMIN), true);
  assert.equal(puedeVerMovimientos(ROLES.ENCARGADO), true);
  assert.equal(puedeVerMovimientos(ROLES.COORD), false);
});

test('solo encargados registran movimientos y únicamente en su sucursal', () => {
  assert.equal(puedeRegistrarMovimiento(ROLES.ENCARGADO, 2, 2), true);
  assert.equal(puedeRegistrarMovimiento(ROLES.ENCARGADO, 2, 3), false);
  assert.equal(puedeRegistrarMovimiento(ROLES.ADMIN, 2, 2), false);
  assert.equal(puedeRegistrarMovimiento(ROLES.COORD, 2, 2), false);
});

test('formulario de sucursal genera campos exactos del backend con número válido', () => {
  const data = sucursalPayload({
    codigo: 'S01',
    nombre: 'Demo',
    tipo: 'GASOLINERA',
    departamento: 'Jutiapa',
    municipio: 'Asunción Mita',
    direccion: 'Prueba',
    tiempo_entrega_min: '45',
    activa: 'S',
  });
  assert.equal(data.tiempo_entrega_min, 45);
  assert.deepEqual(
    Object.keys(data).sort(),
    [
      'activa',
      'codigo',
      'departamento',
      'direccion',
      'municipio',
      'nombre',
      'tiempo_entrega_min',
      'tipo',
    ].sort(),
  );
});

test('formulario de sucursal rechaza tiempo fraccionario y tipo inválido', () => {
  const data = {
    codigo: 'S01',
    nombre: 'Demo',
    tipo: 'GASOLINERA',
    departamento: 'Jutiapa',
    municipio: 'Mita',
    direccion: 'Prueba',
    tiempo_entrega_min: '2.5',
    activa: 'S',
  };
  assert.throws(() => sucursalPayload(data), /entero/);
  assert.throws(
    () => sucursalPayload({ ...data, tipo: 'ALMACEN', tiempo_entrega_min: '30' }),
    /inválido/,
  );
});

test('formulario de medicamentos respeta nombres y límites de campos', () => {
  assert.deepEqual(
    medicamentoPayload({ codigo: 'm01', nombre: 'Demo', presentacion: 'Caja', activo: 'S' }),
    { codigo: 'm01', nombre: 'Demo', presentacion: 'Caja', activo: 'S' },
  );
  assert.throws(
    () =>
      medicamentoPayload({
        codigo: 'A'.repeat(31),
        nombre: 'Demo',
        presentacion: 'Caja',
        activo: 'S',
      }),
    /codigo/,
  );
});

test('movimiento convierte IDs y cantidad a enteros nativos antes del POST', () => {
  const data = movimientoPayload(
    {
      id_sucursal: '2',
      id_medicamento: '4',
      tipo: 'AJUSTE_ENTRADA',
      cantidad: '5',
      motivo: 'Corrección',
    },
    { rol: ROLES.ENCARGADO, id_sucursal: 2 },
  );
  assert.deepEqual(data, {
    id_sucursal: 2,
    id_medicamento: 4,
    tipo: 'AJUSTE_ENTRADA',
    cantidad: 5,
    motivo: 'Corrección',
  });
});

test('movimiento evita envío sin motivo para ajustes y rechaza cantidades incorrectas', () => {
  const usuario = { rol: ROLES.ENCARGADO, id_sucursal: 2 };
  const mov = {
    id_sucursal: 2,
    id_medicamento: 1,
    tipo: 'AJUSTE_SALIDA',
    cantidad: '1',
    motivo: '',
  };
  assert.throws(() => movimientoPayload(mov, usuario), /motivo/);
  assert.throws(
    () => movimientoPayload({ ...mov, tipo: 'INICIAL', cantidad: '-1' }, usuario),
    /entero/,
  );
  assert.throws(
    () => movimientoPayload({ ...mov, tipo: 'INICIAL', cantidad: '0' }, usuario),
    /entre/,
  );
});

test('no se puede enviar ajuste para una sucursal distinta a la asignada', () => {
  const usuario = { rol: ROLES.ENCARGADO, id_sucursal: 3 };
  assert.throws(
    () =>
      movimientoPayload(
        { id_sucursal: 1, id_medicamento: 2, tipo: 'INICIAL', cantidad: '1' },
        usuario,
      ),
    /propia sucursal/,
  );
});

test('validación numérica evita decimales y valores fuera de rango', () => {
  assert.equal(aNumeroEntero('8', 'Cantidad'), 8);
  assert.throws(() => aNumeroEntero('8.5', 'Cantidad'), /entero/);
  assert.throws(() => aNumeroEntero('9999999999999999999999', 'Cantidad'), /entero/);
});

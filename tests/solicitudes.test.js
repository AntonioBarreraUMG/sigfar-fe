import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/services/http.js';
import { ROLES, modulosPorRol } from '../src/utils/access.js';
import {
  listSolicitudesApi,
  getSolicitudApi,
  createSolicitudApi,
  disponibilidadApi,
  opcionesSolicitudApi,
  confirmarSolicitudApi,
  despacharSolicitudApi,
  entregarSolicitudApi,
  cancelarSolicitudApi,
} from '../src/services/solicitudesApi.js';
import {
  ESTADOS_SOLICITUD,
  FORMAS_PAGO,
  accionSolicitud,
  puedeCrearSolicitud,
  puedeVerOpciones,
  validarTexto,
  detallesPayload,
  disponibilidadPayload,
  solicitudPayload,
  confirmacionPayload,
  tiempoEstimadoEtiqueta,
} from '../src/utils/solicitudes.js';

const coord = { rol: ROLES.COORD, id_sucursal: null };
const admin = { rol: ROLES.ADMIN, id_sucursal: null };
const encargado1 = { rol: ROLES.ENCARGADO, id_sucursal: 1 };
const encargado2 = { rol: ROLES.ENCARGADO, id_sucursal: 2 };
const meds = [
  { id_medicamento: 2, activo: 'S' },
  { id_medicamento: 4, activo: 'S' },
  { id_medicamento: 6, activo: 'N' },
];
const form = {
  cliente_nombre: '  Ana Lopez  ',
  cliente_telefono: ' 5555-1234 ',
  departamento_entrega: ' Jutiapa ',
  municipio_entrega: ' Asuncion Mita ',
  direccion_entrega: ' Calle 1, zona 1 ',
  detalles: [
    { id_medicamento: '4', cantidad: '3' },
    { id_medicamento: '2', cantidad: '1' },
  ],
};
const opciones = [{ id_sucursal: 1, nombre: 'Farmacia Centro', tiempo_entrega_min: 45 }];
function http(status = 200, payload = { datos: {} }) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}
function mock(fn = () => http()) {
  const llamadas = [];
  const api = createApiClient({
    getToken: () => 'jwt.qa',
    fetcher: async (url, options) => {
      llamadas.push({ url, options });
      return fn(url, options);
    },
  });
  return { api, llamadas };
}

test('el módulo está visible para los tres roles, sin otorgar escritura', () => {
  for (const role of Object.values(ROLES)) {
    assert.ok(modulosPorRol(role).find((x) => x.id === 'solicitudes'));
  }
  assert.equal(puedeCrearSolicitud(coord), true);
  assert.equal(puedeCrearSolicitud(admin), false);
  assert.equal(puedeCrearSolicitud(encargado1), false);
});
test('opciones están permitidas al coordinador y administrador, no al encargado', () => {
  assert.equal(puedeVerOpciones(coord), true);
  assert.equal(puedeVerOpciones(admin), true);
  assert.equal(puedeVerOpciones(encargado1), false);
});
test('coordinador puede confirmar/cancelar pendiente, cancelar confirmada y entregar despachada', () => {
  assert.deepEqual(accionSolicitud(coord, { estado: 'PENDIENTE' }), ['confirmar', 'cancelar']);
  assert.deepEqual(accionSolicitud(coord, { estado: 'CONFIRMADA' }), ['cancelar']);
  assert.deepEqual(accionSolicitud(coord, { estado: 'DESPACHADA' }), ['entregar']);
});
test('encargado únicamente despacha o entrega si es la sucursal asignada', () => {
  assert.deepEqual(accionSolicitud(encargado1, { estado: 'CONFIRMADA', id_sucursal_asignada: 1 }), [
    'despachar',
  ]);
  assert.deepEqual(accionSolicitud(encargado1, { estado: 'DESPACHADA', id_sucursal_asignada: 1 }), [
    'entregar',
  ]);
  assert.deepEqual(
    accionSolicitud(encargado2, { estado: 'CONFIRMADA', id_sucursal_asignada: 1 }),
    [],
  );
  assert.deepEqual(
    accionSolicitud(encargado1, { estado: 'PENDIENTE', id_sucursal_asignada: null }),
    [],
  );
});
test('administrador y estados finales no habilitan transiciones', () => {
  assert.deepEqual(accionSolicitud(admin, { estado: 'PENDIENTE' }), []);
  for (const estado of ['ENTREGADA', 'CANCELADA']) {
    assert.deepEqual(accionSolicitud(coord, { estado }), []);
    assert.deepEqual(accionSolicitud(encargado1, { estado, id_sucursal_asignada: 1 }), []);
  }
  assert.deepEqual(ESTADOS_SOLICITUD, [
    'PENDIENTE',
    'CONFIRMADA',
    'DESPACHADA',
    'ENTREGADA',
    'CANCELADA',
  ]);
  assert.deepEqual(FORMAS_PAGO, ['EFECTIVO', 'TARJETA']);
});
test('solicitud normaliza textos y ordena medicamentos para POST', () => {
  assert.deepEqual(solicitudPayload(form, meds, coord), {
    cliente_nombre: 'Ana Lopez',
    cliente_telefono: '5555-1234',
    direccion_entrega: 'Calle 1, zona 1',
    departamento_entrega: 'Jutiapa',
    municipio_entrega: 'Asuncion Mita',
    detalles: [
      { id_medicamento: 2, cantidad: 1 },
      { id_medicamento: 4, cantidad: 3 },
    ],
  });
});
test('disponibilidad solo envía departamento, municipio y detalles', () => {
  const expected = disponibilidadPayload(form, meds);
  assert.deepEqual(
    Object.keys(expected).sort(),
    ['departamento_entrega', 'detalles', 'municipio_entrega'].sort(),
  );
  assert.equal(expected.detalles.length, 2);
});
test('rechaza creación por usuario sin rol coordinador', () => {
  assert.throws(() => solicitudPayload(form, meds, admin), /Solo el coordinador/);
  assert.throws(() => solicitudPayload(form, meds, encargado1), /Solo el coordinador/);
});
test('valida campos requeridos, longitud y espacios', () => {
  assert.throws(() => validarTexto(' ', 'Cliente', 120), /entre 1 y 120/);
  assert.throws(() => validarTexto('x'.repeat(121), 'Cliente', 120), /entre 1 y 120/);
  assert.equal(validarTexto(' Hola ', 'Cliente', 120), 'Hola');
  assert.throws(
    () => solicitudPayload({ ...form, direccion_entrega: '' }, meds, coord),
    /Dirección/,
  );
});
test('rechaza solicitudes sin medicamentos o con más de 20', () => {
  assert.throws(() => detallesPayload([], meds), /entre 1 y 20/);
  assert.throws(
    () =>
      detallesPayload(
        Array.from({ length: 21 }, () => ({ id_medicamento: '2', cantidad: '1' })),
        meds,
      ),
    /entre 1 y 20/,
  );
});
test('rechaza medicamentos repetidos, inactivos e inexistentes', () => {
  assert.throws(
    () =>
      detallesPayload(
        [
          { id_medicamento: '2', cantidad: '1' },
          { id_medicamento: '2', cantidad: '1' },
        ],
        meds,
      ),
    /repetir/,
  );
  assert.throws(() => detallesPayload([{ id_medicamento: '6', cantidad: '1' }], meds), /inactivo/);
  assert.throws(
    () => detallesPayload([{ id_medicamento: '999', cantidad: '1' }], meds),
    /no está en el catálogo/,
  );
});
test('rechaza cantidades no positivas, fracciones y valores inválidos', () => {
  for (const cantidad of ['0', '-1', '1.5', 'x', '', '10000000000']) {
    assert.throws(() => detallesPayload([{ id_medicamento: '2', cantidad }], meds), /Cantidad/);
  }
});
test('confirmación exige sucursal elegible y forma de pago admitida', () => {
  assert.deepEqual(
    confirmacionPayload({ id_sucursal: '1', forma_pago: 'EFECTIVO' }, opciones, coord, {
      estado: 'PENDIENTE',
    }),
    { id_sucursal: 1, forma_pago: 'EFECTIVO' },
  );
  assert.throws(
    () =>
      confirmacionPayload({ id_sucursal: '2', forma_pago: 'EFECTIVO' }, opciones, coord, {
        estado: 'PENDIENTE',
      }),
    /elegible/,
  );
  assert.throws(
    () =>
      confirmacionPayload({ id_sucursal: '1', forma_pago: 'OTRO' }, opciones, coord, {
        estado: 'PENDIENTE',
      }),
    /inválida/,
  );
});
test('confirmación rechaza rol distinto o solicitud ya confirmada', () => {
  const data = { id_sucursal: '1', forma_pago: 'TARJETA' };
  assert.throws(
    () => confirmacionPayload(data, opciones, admin, { estado: 'PENDIENTE' }),
    /coordinador/,
  );
  assert.throws(
    () => confirmacionPayload(data, opciones, coord, { estado: 'CONFIRMADA' }),
    /pendiente/,
  );
});
test('muestra tiempos estimados sin asignar métricas inexistentes', () => {
  assert.equal(tiempoEstimadoEtiqueta(45), '45 minutos estimados');
  assert.equal(tiempoEstimadoEtiqueta(null), 'Tiempo no disponible');
});
test('listado envía filtros de sucursal, estado y paginación reales', async () => {
  const { api, llamadas } = mock(() => http(200, { datos: [{ id_solicitud: 8 }] }));
  assert.equal(
    (await listSolicitudesApi(api, { estado: 'PENDIENTE', id_sucursal: '2' }, { desde: 20 }))[0]
      .id_solicitud,
    8,
  );
  assert.equal(
    llamadas[0].url,
    '/api/v1/solicitudes?estado=PENDIENTE&id_sucursal=2&desde=20&limite=20',
  );
  assert.equal(llamadas[0].options.headers.Authorization, 'Bearer jwt.qa');
});
test('listado sin filtros no agrega parámetros vacíos', async () => {
  const { api, llamadas } = mock();
  await listSolicitudesApi(api, { estado: '', id_sucursal: '' });
  assert.equal(llamadas[0].url, '/api/v1/solicitudes?desde=0&limite=20');
});
test('detalle devuelve datos con medicamentos/reservas', async () => {
  const { api, llamadas } = mock(() =>
    http(200, {
      datos: { id_solicitud: 9, detalles: [{ id_medicamento: 2, estado_reserva: 'ACTIVA' }] },
    }),
  );
  const data = await getSolicitudApi(api, 9);
  assert.equal(data.detalles[0].estado_reserva, 'ACTIVA');
  assert.equal(llamadas[0].url, '/api/v1/solicitudes/9');
});
test('consulta disponibilidad por POST y conserva respuesta opciones', async () => {
  const { api, llamadas } = mock(() =>
    http(200, {
      datos: { departamento_entrega: 'Jutiapa', municipio_entrega: 'Asuncion Mita', opciones },
    }),
  );
  assert.equal(
    (await disponibilidadApi(api, disponibilidadPayload(form, meds))).opciones.length,
    1,
  );
  assert.equal(llamadas[0].url, '/api/v1/solicitudes/disponibilidad');
  assert.equal(llamadas[0].options.method, 'POST');
  assert.deepEqual(
    Object.keys(JSON.parse(llamadas[0].options.body)).sort(),
    ['departamento_entrega', 'detalles', 'municipio_entrega'].sort(),
  );
});
test('registra solicitud pendiente mediante POST con contrato exacto', async () => {
  const { api, llamadas } = mock(() =>
    http(201, { datos: { id_solicitud: 35, estado: 'PENDIENTE' } }),
  );
  const data = await createSolicitudApi(api, solicitudPayload(form, meds, coord));
  assert.equal(data.estado, 'PENDIENTE');
  assert.equal(llamadas[0].url, '/api/v1/solicitudes');
  assert.equal(llamadas[0].options.method, 'POST');
  assert.equal(JSON.parse(llamadas[0].options.body).cliente_nombre, 'Ana Lopez');
});
test('consulta opciones asociadas a una solicitud pendiente', async () => {
  const { api, llamadas } = mock(() =>
    http(200, { datos: { id_solicitud: 21, estado: 'PENDIENTE', opciones } }),
  );
  assert.equal((await opcionesSolicitudApi(api, 21)).opciones[0].id_sucursal, 1);
  assert.equal(llamadas[0].url, '/api/v1/solicitudes/21/opciones');
});
test('confirma mediante POST con id_sucursal y forma_pago, sin otras claves', async () => {
  const { api, llamadas } = mock();
  const body = confirmacionPayload({ id_sucursal: '1', forma_pago: 'TARJETA' }, opciones, coord, {
    estado: 'PENDIENTE',
  });
  await confirmarSolicitudApi(api, 21, body);
  assert.equal(llamadas[0].url, '/api/v1/solicitudes/21/confirmar');
  assert.equal(llamadas[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(llamadas[0].options.body), { id_sucursal: 1, forma_pago: 'TARJETA' });
});
test('despachar, entregar y cancelar son POST sin cuerpo JSON', async () => {
  const { api, llamadas } = mock();
  await despacharSolicitudApi(api, 21);
  await entregarSolicitudApi(api, 21);
  await cancelarSolicitudApi(api, 21);
  assert.deepEqual(
    llamadas.map((l) => l.url),
    [
      '/api/v1/solicitudes/21/despachar',
      '/api/v1/solicitudes/21/entregar',
      '/api/v1/solicitudes/21/cancelar',
    ],
  );
  assert.ok(llamadas.every((l) => l.options.method === 'POST' && !('body' in l.options)));
});
test('conflictos de disponibilidad 409 se muestran como errores, no éxitos', async () => {
  const { api } = mock(() =>
    http(409, { error: { mensaje: 'Inventario disponible insuficiente', codigo: 'CONFLICTO' } }),
  );
  await assert.rejects(
    () => confirmarSolicitudApi(api, 21, { id_sucursal: 1, forma_pago: 'EFECTIVO' }),
    (e) => e.status === 409 && /insuficiente/.test(e.message),
  );
});
test('permiso denegado 403 se propaga al formulario', async () => {
  const { api } = mock(() => http(403, { error: { mensaje: 'No autorizado' } }));
  await assert.rejects(
    () => despacharSolicitudApi(api, 21),
    (e) => e.status === 403,
  );
});

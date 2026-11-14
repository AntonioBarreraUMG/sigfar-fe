import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApiClient, ApiError } from '../src/services/http.js';
import { ROLES, MODULOS, puedeAcceder, modulosPorRol } from '../src/utils/access.js';
import {
  listarAuditoriaApi,
  resumenAuditoriaApi,
  detalleAuditoriaApi,
  LIMITE_AUDITORIA,
} from '../src/services/auditoriaApi.js';
import {
  FILTROS_VACIOS_AUDITORIA,
  puedeVerAuditoria,
  validarFiltrosAuditoria,
  paginasAuditoria,
  rangoAuditoria,
  textoSnapshot,
  sucursalAuditoria,
} from '../src/utils/auditoria.js';

const data = [
  {
    id_auditoria: 18,
    id_usuario: 1,
    usuario: 'Administrador',
    id_sucursal: 2,
    sucursal: 'Farmacia Dos',
    entidad: 'TRANSFERENCIA',
    id_registro: 4,
    accion: 'RECIBIR',
    fecha_evento: '2026-10-31T15:00:00-06:00',
  },
];
const detalle = {
  ...data[0],
  datos_anteriores: { estado: 'EN_TRANSITO' },
  datos_nuevos: { estado: 'RECIBIDA' },
};
const resumen = {
  total: 1,
  por_entidad: [{ entidad: 'TRANSFERENCIA', cantidad: 1 }],
  por_sucursal: [{ id_sucursal: 2, sucursal: 'Farmacia Dos', cantidad: 1 }],
};

function http(status = 200, payload = { datos: [] }) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}
function mock(fetcher = async () => http()) {
  const calls = [];
  const api = createApiClient({
    getToken: () => 'qa-token',
    fetcher: async (url, options) => {
      calls.push({ url, options });
      return fetcher(url, options);
    },
  });
  return { api, calls };
}

test('rol administrador puede consultar auditoría', () =>
  assert.equal(puedeVerAuditoria(ROLES.ADMIN), true));
test('encargado no puede consultar auditoría', () =>
  assert.equal(puedeVerAuditoria(ROLES.ENCARGADO), false));
test('coordinador no puede consultar auditoría', () =>
  assert.equal(puedeVerAuditoria(ROLES.COORD), false));
test('auditoría solo se muestra en el menú del administrador', () => {
  const audit = MODULOS.find((m) => m.id === 'auditoria');
  assert.ok(audit);
  assert.equal(puedeAcceder(ROLES.ADMIN, audit), true);
  assert.equal(modulosPorRol(ROLES.ENCARGADO).includes(audit), false);
  assert.equal(modulosPorRol(ROLES.COORD).includes(audit), false);
});
test('valida filtros vacíos como búsqueda global', () =>
  assert.deepEqual(validarFiltrosAuditoria(FILTROS_VACIOS_AUDITORIA), {}));
test('normaliza los identificadores y etiquetas permitidas', () => {
  assert.deepEqual(
    validarFiltrosAuditoria({
      id_sucursal: '2',
      id_usuario: '3',
      id_registro: '78',
      entidad: ' transferencia ',
      accion: ' recibir ',
    }),
    {
      id_sucursal: 2,
      id_usuario: 3,
      id_registro: 78,
      entidad: 'TRANSFERENCIA',
      accion: 'RECIBIR',
    },
  );
});
test('rechaza identificadores no positivos y malformados', () => {
  for (const value of ['0', '-1', '1.2', 'hola', '1 OR 1=1', '99999999999']) {
    assert.throws(() => validarFiltrosAuditoria({ id_usuario: value }), /id_usuario/);
  }
});
test('rechaza etiquetas no admitidas', () => {
  for (const value of ['TRANSFERENCIA;DELETE', '_AJUSTE', 'ÁREA', 'ACCION-1']) {
    assert.throws(() => validarFiltrosAuditoria({ entidad: value }), /entidad/);
  }
});
test('rechaza acciones mayores a 40 caracteres', () =>
  assert.throws(() => validarFiltrosAuditoria({ accion: 'A'.repeat(41) }), /accion/));
test('rechaza entidades mayores a 60 caracteres', () =>
  assert.throws(() => validarFiltrosAuditoria({ entidad: 'A'.repeat(61) }), /entidad/));
test('rechaza filtros ajenos al backend', () =>
  assert.throws(() => validarFiltrosAuditoria({ admin: 'true' }), /no admitido/));
test('admite fechas válidas y años bisiestos', () => {
  assert.deepEqual(
    validarFiltrosAuditoria({ fecha_desde: '2024-02-29', fecha_hasta: '2024-03-01' }),
    { fecha_desde: '2024-02-29', fecha_hasta: '2024-03-01' },
  );
});
test('rechaza fechas imposibles, incluso febrero no bisiesto', () => {
  for (const value of ['2025-02-29', '2026-13-01', '2026-04-31', 'not-a-date']) {
    assert.throws(() => validarFiltrosAuditoria({ fecha_desde: value }), /fecha_desde/);
  }
});
test('rechaza rangos de fechas invertidos', () =>
  assert.throws(
    () => validarFiltrosAuditoria({ fecha_desde: '2026-10-31', fecha_hasta: '2026-10-01' }),
    /posterior/,
  ));
test('obtiene listado con total, paginación y token', async () => {
  const { api, calls } = mock(async () =>
    http(200, { datos: data, total: 31, paginacion: { desde: 20, limite: 20 } }),
  );
  const result = await listarAuditoriaApi(
    api,
    { entidad: 'TRANSFERENCIA', id_sucursal: 2 },
    { desde: 20 },
  );
  assert.equal(result.total, 31);
  assert.equal(result.datos[0].accion, 'RECIBIR');
  assert.equal(
    calls[0].url,
    '/api/v1/auditoria/registros?entidad=TRANSFERENCIA&id_sucursal=2&desde=20&limite=20',
  );
  assert.equal(calls[0].options.headers.Authorization, 'Bearer qa-token');
  assert.equal(calls[0].options.method, 'GET');
});
test('carga listado inicial con límite explícito', async () => {
  const { api, calls } = mock(async () => http(200, { datos: [], total: 0 }));
  await listarAuditoriaApi(api);
  assert.ok(calls[0].url.endsWith(`?desde=0&limite=${LIMITE_AUDITORIA}`));
});
test('solicita resumen con los mismos filtros, sin paginación', async () => {
  const { api, calls } = mock(async () => http(200, { datos: resumen }));
  const result = await resumenAuditoriaApi(api, { id_usuario: 1, fecha_desde: '2026-10-01' });
  assert.deepEqual(result, resumen);
  assert.equal(calls[0].url, '/api/v1/auditoria/resumen?id_usuario=1&fecha_desde=2026-10-01');
});
test('consulta detalle de registro por ID', async () => {
  const { api, calls } = mock(async () => http(200, { datos: detalle }));
  const result = await detalleAuditoriaApi(api, 18);
  assert.deepEqual(result.datos_anteriores, { estado: 'EN_TRANSITO' });
  assert.equal(calls[0].url, '/api/v1/auditoria/registros/18');
});
test('rechaza ID de detalle incorrecto antes de HTTP', async () => {
  const { api, calls } = mock();
  for (const id of ['0', -2, '20x', 'foo', '1/editar', '999999999999999999999999999']) {
    assert.throws(() => detalleAuditoriaApi(api, id), /Identificador/);
  }
  assert.equal(calls.length, 0);
});
test('HTTP 403 se propaga al consultar historial sin permiso', async () => {
  const { api } = mock(async () =>
    http(403, { error: { codigo: 'SIN_PERMISO', mensaje: 'Acceso denegado.' } }),
  );
  await assert.rejects(
    () => listarAuditoriaApi(api),
    (e) => e instanceof ApiError && e.status === 403,
  );
});
test('HTTP 401 al consultar detalle se propaga a sesión', async () => {
  let invalidaciones = 0;
  const api = createApiClient({
    getToken: () => 'qa-token',
    onUnauthorized: () => invalidaciones++,
    fetcher: async () => http(401, { error: { mensaje: 'Token inválido' } }),
  });
  await assert.rejects(
    () => detalleAuditoriaApi(api, 1),
    (e) => e.status === 401,
  );
  assert.equal(invalidaciones, 1);
});
test('los tres endpoints son GET, sin escrituras', async () => {
  const { api, calls } = mock(async (url) =>
    url.endsWith('/resumen')
      ? http(200, { datos: resumen })
      : url.endsWith('/1')
        ? http(200, { datos: detalle })
        : http(200, { datos: data, total: 1 }),
  );
  await listarAuditoriaApi(api);
  await resumenAuditoriaApi(api);
  await detalleAuditoriaApi(api, 1);
  assert.ok(calls.every((c) => c.options.method === 'GET' && c.options.body === undefined));
});
test('cálculo de paginación utiliza total del backend', () => {
  assert.equal(paginasAuditoria(0, 20), 0);
  assert.equal(paginasAuditoria(20, 20), 1);
  assert.equal(paginasAuditoria(21, 20), 2);
  assert.equal(paginasAuditoria(101, 20), 6);
  assert.equal(rangoAuditoria(20, 5), '21–25');
  assert.equal(rangoAuditoria(40, 0), '0');
});
test('los datos históricos JSON se muestran como texto legible', () => {
  assert.match(textoSnapshot({ accion: 'RECIBIR', cantidad: 2 }), /"cantidad": 2/);
  assert.equal(textoSnapshot(null), 'Sin datos registrados.');
  assert.equal(textoSnapshot('<script>alert(1)</script>'), '<script>alert(1)</script>');
});
test('resumen reconoce registros globales sin sucursal', () => {
  assert.equal(sucursalAuditoria(null, null), 'Operación global (sin sucursal)');
  assert.equal(sucursalAuditoria('', 4), 'Sucursal ID 4');
  assert.equal(sucursalAuditoria('Farmacia central', 1), 'Farmacia central');
});
test('pantalla enlazada a ruta, sin escritura de auditoría', () => {
  const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../src/pages/AuditoriaPage.jsx', import.meta.url), 'utf8');
  assert.match(app, /auditoria: AuditoriaPage/);
  assert.match(page, /puedeVerAuditoria\(usuario\?\.rol\)/);
  assert.doesNotMatch(page, /registrarAuditoriaApi|actualizarAuditoriaApi|borrarAuditoriaApi/);
});

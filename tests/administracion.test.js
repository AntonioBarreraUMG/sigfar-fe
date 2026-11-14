import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLES } from '../src/utils/access.js';
import {
  puedeConsultarAdministracion,
  puedeEscribirAdministracion,
  decimalApi,
  periodoValido,
  fechaValida,
  rangoFechas,
  rangoPeriodos,
  efectivoPayload,
  planillaPayload,
  correccionPlanillaPayload,
  activoPayload,
  cambioActivoPayload,
  monedaGTQ,
} from '../src/utils/administracion.js';
import {
  listAdministracionApi,
  resumenAdministracionApi,
  detalleAdministracionApi,
  registrarEfectivoApi,
  registrarPlanillaApi,
  corregirPlanillaApi,
  registrarActivoApi,
  actualizarActivoApi,
} from '../src/services/administracionApi.js';

const encargado = { rol: ROLES.ENCARGADO, id_sucursal: 3 };
const admin = { rol: ROLES.ADMIN, id_sucursal: null };
const coord = { rol: ROLES.COORD, id_sucursal: null };
const spy = () => {
  const llamadas = [];
  const api = async (path, options = {}) => {
    llamadas.push({ path, ...options });
    return { datos: [{ id: 1 }], totales: { total_planilla: 100 }, por_sucursal: [] };
  };
  return { api, llamadas };
};

test('Administración consultable únicamente por administrador y encargado', () => {
  assert.equal(puedeConsultarAdministracion(ROLES.ADMIN), true);
  assert.equal(puedeConsultarAdministracion(ROLES.ENCARGADO), true);
  assert.equal(puedeConsultarAdministracion(ROLES.COORD), false);
});
test('Solo el encargado escribe en su sucursal', () => {
  assert.equal(puedeEscribirAdministracion(encargado, 3), true);
  assert.equal(puedeEscribirAdministracion(encargado, '3'), true);
  assert.equal(puedeEscribirAdministracion(encargado, 2), false);
  assert.equal(puedeEscribirAdministracion(admin, 3), false);
  assert.equal(puedeEscribirAdministracion(coord, 3), false);
});
test('El importe mantiene forma de texto para Oracle', () => {
  assert.equal(decimalApi('00125.50', 'Monto'), '00125.50');
  assert.equal(decimalApi('999999999999.99', 'Monto'), '999999999999.99');
  assert.equal(decimalApi('0.01', 'Monto'), '0.01');
});
test('El importe rechaza números JavaScript con formato incorrecto', () => {
  for (const monto of [
    '',
    '0',
    '0.00',
    '-1.00',
    '1,20',
    '1.234',
    '1e3',
    '1234567890123.00',
    '  ',
    'abc',
  ]) {
    assert.throws(() => decimalApi(monto, 'Monto'), Error, monto);
  }
});
test('Los gastos y activos permiten cero si lo autoriza el backend', () => {
  assert.equal(decimalApi('0.00', 'Monto', { permitirCero: true }), '0.00');
  assert.equal(decimalApi('0', 'Monto', { permitirCero: true }), '0');
});
test('Los períodos aceptan solo AAAA-MM', () => {
  assert.equal(periodoValido('2026-10'), '2026-10');
  for (const str of ['2026-00', '2026-13', '10-2026', '2026-1', '2026/10'])
    assert.throws(() => periodoValido(str));
});
test('Las fechas detectan días inválidos y año bisiesto', () => {
  assert.equal(fechaValida('2028-02-29'), '2028-02-29');
  assert.equal(fechaValida('0099-12-31'), '0099-12-31');
  for (const str of ['2026-02-29', '2026-04-31', '2026-13-01', '2026/10/15', '2026-10-00'])
    assert.throws(() => fechaValida(str));
});
test('Rangos de fechas y períodos rechazan inversiones', () => {
  assert.deepEqual(rangoFechas({ fecha_desde: '2026-10-01', fecha_hasta: '2026-10-31' }), {
    fecha_desde: '2026-10-01',
    fecha_hasta: '2026-10-31',
  });
  assert.throws(() => rangoFechas({ fecha_desde: '2027-01-01', fecha_hasta: '2026-10-01' }));
  assert.throws(() => rangoPeriodos({ periodo_desde: '2027-01', periodo_hasta: '2026-10' }));
});
test('Registrar efectivo crea el JSON preciso', () => {
  assert.deepEqual(
    efectivoPayload(
      { id_sucursal: '3', tipo: 'EGRESO', concepto: ' Transporte ', monto: '109.90' },
      encargado,
    ),
    { id_sucursal: 3, tipo: 'EGRESO', concepto: 'Transporte', monto: '109.90' },
  );
});
test('Efectivo rechaza tipo no admitido, monto cero y sucursal ajena', () => {
  assert.throws(() =>
    efectivoPayload({ id_sucursal: '2', tipo: 'INGRESO', concepto: 'X', monto: '1' }, encargado),
  );
  assert.throws(() =>
    efectivoPayload({ id_sucursal: '3', tipo: 'ABONO', concepto: 'X', monto: '1' }, encargado),
  );
  assert.throws(() =>
    efectivoPayload({ id_sucursal: '3', tipo: 'INGRESO', concepto: 'X', monto: '0' }, encargado),
  );
  assert.throws(() =>
    efectivoPayload({ id_sucursal: '3', tipo: 'INGRESO', concepto: '   ', monto: '1' }, encargado),
  );
});
test('Registrar planilla acepta cero y período válido', () => {
  assert.deepEqual(
    planillaPayload({ id_sucursal: '3', periodo: '2026-10', monto_total: '0.00' }, encargado),
    { id_sucursal: 3, periodo: '2026-10', monto_total: '0.00' },
  );
});
test('Planilla rechaza período inválido y sucursal ajena', () => {
  assert.throws(() =>
    planillaPayload({ id_sucursal: 2, periodo: '2026-10', monto_total: '5' }, encargado),
  );
  assert.throws(() =>
    planillaPayload({ id_sucursal: 3, periodo: '2026-15', monto_total: '5' }, encargado),
  );
});
test('Corrección de planilla envía solo el monto', () => {
  assert.deepEqual(correccionPlanillaPayload({ monto_total: '400.20', periodo: '2024-11' }), {
    monto_total: '400.20',
  });
});
test('Registro de activo normaliza código y conserva valor como texto', () => {
  assert.deepEqual(
    activoPayload(
      { id_sucursal: '3', codigo: ' act-01 ', descripcion: ' Escritorio ', valor: '150.00' },
      encargado,
    ),
    { id_sucursal: 3, codigo: 'ACT-01', descripcion: 'Escritorio', valor: '150.00' },
  );
});
test('Activos rechazan códigos largos, sucursal ajena y valor negativo', () => {
  assert.throws(() =>
    activoPayload(
      { id_sucursal: 3, codigo: 'x'.repeat(31), descripcion: 'Bien', valor: '1' },
      encargado,
    ),
  );
  assert.throws(() =>
    activoPayload({ id_sucursal: 5, codigo: 'ACT-1', descripcion: 'Bien', valor: '1' }, encargado),
  );
  assert.throws(() =>
    activoPayload({ id_sucursal: 3, codigo: 'ACT-1', descripcion: 'Bien', valor: '-1' }, encargado),
  );
});
test('Actualización activo solo envía descripción, valor y estado', () => {
  assert.deepEqual(
    cambioActivoPayload({
      codigo: 'NO_CAMBIAR',
      descripcion: 'Laptop',
      estado: 'BAJA',
      valor: '0.00',
    }),
    { descripcion: 'Laptop', estado: 'BAJA', valor: '0.00' },
  );
});
test('El estado de activo debe ser VIGENTE o BAJA', () => {
  assert.throws(() =>
    cambioActivoPayload({ descripcion: 'Equipo', valor: '1', estado: 'PENDIENTE' }),
  );
});
test('Formato monetario GTQ y ausencias', () => {
  assert.match(monedaGTQ('2500.25'), /2,500\.25|2 500,25|2.500,25|2500,25/);
  assert.equal(monedaGTQ('mal'), '—');
});

test('Listado de efectivo usa movimientos y admite filtros por fecha y tipo', async () => {
  const { api, llamadas } = spy();
  assert.deepEqual(
    await listAdministracionApi(
      api,
      'efectivo',
      { id_sucursal: 3, tipo: 'INGRESO', fecha_desde: '2026-01-01' },
      { desde: 20, limite: 20 },
    ),
    [{ id: 1 }],
  );
  assert.match(llamadas[0].path, /^\/efectivo\/movimientos\?/);
  for (const q of [
    'id_sucursal=3',
    'tipo=INGRESO',
    'fecha_desde=2026-01-01',
    'desde=20',
    'limite=20',
  ])
    assert.ok(llamadas[0].path.includes(q));
});
test('Listados de planilla y activos usan rutas reales', async () => {
  const { api, llamadas } = spy();
  await listAdministracionApi(api, 'planillas', { periodo_desde: '2026-01' });
  await listAdministracionApi(api, 'activos', { estado: 'BAJA' });
  assert.ok(llamadas[0].path.startsWith('/planillas?'));
  assert.ok(llamadas[1].path.startsWith('/activos?'));
  assert.match(llamadas[1].path, /estado=BAJA/);
});
test('Resúmenes no suponen un campo datos', async () => {
  const { api, llamadas } = spy();
  const r = await resumenAdministracionApi(api, 'efectivo', { id_sucursal: 1 });
  assert.equal(r.totales.total_planilla, 100);
  assert.equal(llamadas[0].path, '/efectivo/resumen?id_sucursal=1');
});
test('Resumen de activos sin filtro explicito calcula solo VIGENTE', async () => {
  const { api, llamadas } = spy();
  await resumenAdministracionApi(api, 'activos', { id_sucursal: 2 });
  assert.equal(llamadas[0].path, '/activos/resumen?id_sucursal=2');
});
test('Detalle de efectivo, planilla y activo utiliza rutas correctas', async () => {
  const { api, llamadas } = spy();
  for (const mod of ['efectivo', 'planillas', 'activos'])
    await detalleAdministracionApi(api, mod, 22);
  assert.deepEqual(
    llamadas.map((x) => x.path),
    ['/efectivo/movimientos/22', '/planillas/22', '/activos/22'],
  );
});
test('Detalles rechazan identificadores inválidos y módulos no permitidos', async () => {
  const { api } = spy();
  assert.throws(() => detalleAdministracionApi(api, 'activos', '0'));
  assert.throws(() => listAdministracionApi(api, 'usuarios', {}));
});
test('Registro de efectivo envia POST exacto', async () => {
  const { api, llamadas } = spy();
  const body = { id_sucursal: 3, tipo: 'INGRESO', concepto: 'Caja', monto: '3.40' };
  await registrarEfectivoApi(api, body);
  assert.deepEqual(llamadas[0], { path: '/efectivo/movimientos', method: 'POST', body });
});
test('Registro y corrección de planilla usan POST/PATCH', async () => {
  const { api, llamadas } = spy();
  await registrarPlanillaApi(api, { id_sucursal: 3, periodo: '2026-10', monto_total: '9.00' });
  await corregirPlanillaApi(api, 8, { monto_total: '10.00' });
  assert.equal(llamadas[0].method, 'POST');
  assert.equal(llamadas[0].path, '/planillas');
  assert.deepEqual(llamadas[1], {
    path: '/planillas/8',
    method: 'PATCH',
    body: { monto_total: '10.00' },
  });
});
test('Registro y modificación de activos usan POST/PATCH', async () => {
  const { api, llamadas } = spy();
  await registrarActivoApi(api, {
    id_sucursal: 3,
    codigo: 'M1',
    descripcion: 'Equipo',
    valor: '25.00',
  });
  await actualizarActivoApi(api, 8, { descripcion: 'Equipo 2', valor: '20.00', estado: 'BAJA' });
  assert.equal(llamadas[0].method, 'POST');
  assert.equal(llamadas[0].path, '/activos');
  assert.deepEqual(llamadas[1], {
    path: '/activos/8',
    method: 'PATCH',
    body: { descripcion: 'Equipo 2', valor: '20.00', estado: 'BAJA' },
  });
});

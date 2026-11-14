import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULOS,
  ROLES,
  modulosPorRol,
  puedeAcceder,
  nombreRol,
  usuarioValido,
} from '../src/utils/access.js';

test('se han definido los tres roles reales del backend', () => {
  assert.deepEqual(Object.values(ROLES), ['ADMIN_CENTRAL', 'ENCARGADO', 'COORD_ENTREGAS']);
});

test('el administrador puede ver los nueve módulos', () => {
  assert.equal(MODULOS.length, 9);
  assert.equal(modulosPorRol(ROLES.ADMIN).length, 9);
});

test('el encargado ve módulos operativos sin acceso a auditoría', () => {
  const ids = modulosPorRol(ROLES.ENCARGADO).map((m) => m.id);
  assert.equal(ids.length, 8);
  assert.ok(ids.includes('transferencias'));
  assert.ok(ids.includes('solicitudes'));
  assert.ok(!ids.includes('auditoria'));
});

test('coordinador puede ver catálogos, inventarios y solicitudes, no finanzas', () => {
  const ids = modulosPorRol(ROLES.COORD).map((m) => m.id);
  assert.deepEqual(ids, ['sucursales', 'medicamentos', 'inventarios', 'solicitudes']);
});

test('rol inexistente no puede acceder a ningún módulo', () => {
  assert.equal(modulosPorRol('DESCONOCIDO').length, 0);
  assert.equal(puedeAcceder('DESCONOCIDO', MODULOS[0]), false);
  assert.equal(nombreRol('DESCONOCIDO'), 'Rol no reconocido');
});

test('las rutas y los nombres de módulo no se repiten', () => {
  assert.equal(new Set(MODULOS.map((m) => m.id)).size, MODULOS.length);
  assert.equal(new Set(MODULOS.map((m) => m.ruta)).size, MODULOS.length);
  assert.ok(MODULOS.every((m) => m.ruta.startsWith('/')));
});

test('estructura de usuario coincide con auth/login y auth/me', () => {
  assert.equal(
    usuarioValido({
      id_usuario: 1,
      nombre: 'Prueba',
      correo: 'prueba@sigfar.test',
      rol: ROLES.ADMIN,
      id_sucursal: null,
    }),
    true,
  );
  assert.equal(
    usuarioValido({
      id_usuario: 1,
      nombre: 'Prueba',
      correo: 'prueba@sigfar.test',
      rol: 'ADMIN_FAKE',
    }),
    false,
  );
  assert.equal(Boolean(usuarioValido(null)), false);
});

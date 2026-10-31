import { ROLES } from './access.js';

export const TIPOS_SUCURSAL = [
  { value: 'CENTRO_COMERCIAL', label: 'Centro comercial' },
  { value: 'GASOLINERA', label: 'Gasolinera' }
];
export const TIPOS_MOVIMIENTO = [
  { value: 'INICIAL', label: 'Inventario inicial' },
  { value: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada' },
  { value: 'AJUSTE_SALIDA', label: 'Ajuste de salida' }
];

export function puedeAdministrarCatalogos(rol) { return rol === ROLES.ADMIN; }
export function puedeVerMovimientos(rol) { return [ROLES.ADMIN, ROLES.ENCARGADO].includes(rol); }
export function puedeRegistrarMovimiento(rol, idUsuarioSucursal, idSucursal) {
  return rol === ROLES.ENCARGADO && Number(idUsuarioSucursal) > 0 && Number(idUsuarioSucursal) === Number(idSucursal);
}
export function aNumeroEntero(texto, nombre, { min = 1, max = 9999999999 } = {}) {
  if (!/^\d+$/.test(String(texto)) || !Number.isSafeInteger(Number(texto))) throw new Error(`${nombre} debe ser un número entero.`);
  const numero = Number(texto);
  if (numero < min || numero > max) throw new Error(`${nombre} debe estar entre ${min} y ${max}.`);
  return numero;
}
export function sucursalPayload(form) {
  const data = {};
  for (const key of ['codigo', 'nombre', 'departamento', 'municipio', 'direccion']) {
    const text = String(form[key] ?? '').trim();
    const max = { codigo: 20, nombre: 120, departamento: 80, municipio: 80, direccion: 250 }[key];
    if (!text || text.length > max) throw new Error(`${key}: introduce entre 1 y ${max} caracteres.`);
    data[key] = text;
  }
  if (!TIPOS_SUCURSAL.some(t => t.value === form.tipo)) throw new Error('Tipo de sucursal inválido.');
  if (!['S', 'N'].includes(form.activa)) throw new Error('Estado inválido.');
  return { ...data, tipo: form.tipo, tiempo_entrega_min: aNumeroEntero(form.tiempo_entrega_min, 'Tiempo estimado', { max: 99999 }), activa: form.activa };
}
export function medicamentoPayload(form) {
  const data = {};
  for (const [key, max] of [['codigo',30],['nombre',150],['presentacion',100]]) {
    const value = String(form[key] ?? '').trim();
    if (!value || value.length > max) throw new Error(`${key}: introduce entre 1 y ${max} caracteres.`);
    data[key] = value;
  }
  if (!['S', 'N'].includes(form.activo)) throw new Error('Estado inválido.');
  return { ...data, activo: form.activo };
}
export function movimientoPayload(form, usuario) {
  const id_sucursal = aNumeroEntero(form.id_sucursal, 'Sucursal');
  if (!puedeRegistrarMovimiento(usuario.rol, usuario.id_sucursal, id_sucursal)) throw new Error('Solo puedes registrar movimientos en tu propia sucursal.');
  const id_medicamento = aNumeroEntero(form.id_medicamento, 'Medicamento');
  const cantidad = aNumeroEntero(form.cantidad, 'Cantidad');
  if (!TIPOS_MOVIMIENTO.some(t => t.value === form.tipo)) throw new Error('Tipo de movimiento inválido.');
  const motivo = String(form.motivo || '').trim();
  if (motivo.length > 250 || (form.tipo !== 'INICIAL' && !motivo)) throw new Error('Los ajustes requieren un motivo de hasta 250 caracteres.');
  return { id_sucursal, id_medicamento, tipo: form.tipo, cantidad, ...(motivo ? { motivo } : {}) };
}
export function etiquetaTipo(tipo, lista) { return lista.find(t => t.value === tipo)?.label || tipo; }
export function fechaLocal(fecha) {
  if (!fecha) return '—';
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guatemala' }).format(date);
}

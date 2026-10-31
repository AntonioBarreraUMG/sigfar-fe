// Validaciones de presentación alineadas con backend/src/utils/administracion.js.
// El backend revalida cada regla y es la autoridad para los permisos.
import { ROLES } from './access.js';
import { aNumeroEntero } from './catalogos.js';

export function puedeConsultarAdministracion(rol) {
  return rol === ROLES.ADMIN || rol === ROLES.ENCARGADO;
}
export function puedeEscribirAdministracion(usuario, idSucursal) {
  return usuario?.rol === ROLES.ENCARGADO && Number.isSafeInteger(Number(usuario?.id_sucursal)) &&
    Number(usuario.id_sucursal) > 0 && Number(usuario.id_sucursal) === Number(idSucursal);
}

export function decimalApi(value, nombre, { permitirCero = false } = {}) {
  const str = String(value ?? '').trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(str)) {
    throw new Error(`${nombre} debe ser un monto decimal sin comas, con hasta dos decimales (ejemplo: 125.50).`);
  }
  const [parteEntera, parteDecimal = ''] = str.split('.');
  if (!permitirCero && /^0+$/.test(parteEntera) && (!parteDecimal || /^0+$/.test(parteDecimal))) {
    throw new Error(`${nombre} debe ser mayor que cero.`);
  }
  // Se conserva como cadena para evitar precisión binaria al enviar a Oracle.
  return str;
}

export function textValid(value, nombre, max) {
  const str = String(value ?? '').trim();
  if (!str || str.length > max) throw new Error(`${nombre} debe tener entre 1 y ${max} caracteres.`);
  return str;
}

export function periodoValido(periodo) {
  if (typeof periodo !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
    throw new Error('El período debe tener el formato AAAA-MM.');
  }
  return periodo;
}
export function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Fecha inválida (AAAA-MM-DD).');
  const [a, m, d] = fecha.split('-').map(Number);
  const leap = a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
  const dias = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (a < 1 || a > 9999 || m < 1 || m > 12 || d < 1 || d > dias[m-1]) {
    throw new Error('Fecha inválida (AAAA-MM-DD).');
  }
  return fecha;
}
export function rangoFechas(filtro) {
  const desde = filtro.fecha_desde ? fechaValida(filtro.fecha_desde) : '';
  const hasta = filtro.fecha_hasta ? fechaValida(filtro.fecha_hasta) : '';
  if (desde && hasta && desde > hasta) throw new Error('La fecha inicial no puede superar la fecha final.');
  return { ...(desde ? { fecha_desde: desde } : {}), ...(hasta ? { fecha_hasta: hasta } : {}) };
}
export function rangoPeriodos(filtro) {
  const desde = filtro.periodo_desde ? periodoValido(filtro.periodo_desde) : '';
  const hasta = filtro.periodo_hasta ? periodoValido(filtro.periodo_hasta) : '';
  if (desde && hasta && desde > hasta) throw new Error('El período inicial no puede superar el final.');
  return { ...(desde ? { periodo_desde: desde } : {}), ...(hasta ? { periodo_hasta: hasta } : {}) };
}

export function efectivoPayload(form, usuario) {
  const id_sucursal = aNumeroEntero(form.id_sucursal, 'Sucursal');
  if (!puedeEscribirAdministracion(usuario, id_sucursal)) throw new Error('No puedes registrar efectivo en otra sucursal.');
  if (!['INGRESO', 'EGRESO'].includes(form.tipo)) throw new Error('Tipo de movimiento inválido.');
  return { id_sucursal, tipo: form.tipo, concepto: textValid(form.concepto, 'Concepto', 250), monto: decimalApi(form.monto, 'Monto') };
}
export function planillaPayload(form, usuario) {
  const id_sucursal = aNumeroEntero(form.id_sucursal, 'Sucursal');
  if (!puedeEscribirAdministracion(usuario, id_sucursal)) throw new Error('No puedes registrar planillas en otra sucursal.');
  return { id_sucursal, periodo: periodoValido(form.periodo), monto_total: decimalApi(form.monto_total, 'Gasto de planilla', { permitirCero: true }) };
}
export function correccionPlanillaPayload(form) {
  return { monto_total: decimalApi(form.monto_total, 'Gasto de planilla', { permitirCero: true }) };
}
export function activoPayload(form, usuario) {
  const id_sucursal = aNumeroEntero(form.id_sucursal, 'Sucursal');
  if (!puedeEscribirAdministracion(usuario, id_sucursal)) throw new Error('No puedes registrar activos en otra sucursal.');
  return { id_sucursal, codigo: textValid(form.codigo, 'Código', 30).toUpperCase(), descripcion: textValid(form.descripcion, 'Descripción', 200), valor: decimalApi(form.valor, 'Valor del activo', { permitirCero: true }) };
}
export function cambioActivoPayload(form) {
  if (!['VIGENTE', 'BAJA'].includes(form.estado)) throw new Error('Estado de activo inválido.');
  return { descripcion: textValid(form.descripcion, 'Descripción', 200), valor: decimalApi(form.valor, 'Valor del activo', { permitirCero: true }), estado: form.estado };
}
export function monedaGTQ(value) {
  const numero = Number(value);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numero)
    : '—';
}

// Validaciones compatibles con construirFiltrosAuditoria() del backend v1.4.
import { ROLES } from './access.js';

export const FILTROS_VACIOS_AUDITORIA = Object.freeze({
  id_sucursal: '', id_usuario: '', entidad: '', accion: '', id_registro: '',
  fecha_desde: '', fecha_hasta: ''
});

const IDS = ['id_sucursal', 'id_usuario', 'id_registro'];
const ETIQUETAS = ['entidad', 'accion'];
const FECHAS = ['fecha_desde', 'fecha_hasta'];

export function puedeVerAuditoria(rol) { return rol === ROLES.ADMIN; }

function fechaValida(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: usa AAAA-MM-DD.`);
  const [y, m, d] = value.split('-').map(Number);
  const dias = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > dias[m-1]) {
    throw new Error(`${label}: fecha inválida.`);
  }
}

export function validarFiltrosAuditoria(draft = {}) {
  const result = {};
  for (const key of Object.keys(draft)) {
    if (![...IDS, ...ETIQUETAS, ...FECHAS].includes(key)) throw new Error(`Filtro no admitido: ${key}.`);
  }
  for (const key of IDS) {
    const value = String(draft[key] ?? '').trim();
    if (!value) continue;
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 9999999999) {
      throw new Error(`${key}: debe ser un identificador entero positivo.`);
    }
    result[key] = Number(value);
  }
  for (const key of ETIQUETAS) {
    const value = String(draft[key] ?? '').trim().toUpperCase();
    if (!value) continue;
    const max = key === 'entidad' ? 60 : 40;
    if (value.length > max || !/^[A-Z][A-Z0-9_]*$/.test(value)) {
      throw new Error(`${key}: usa entre 1 y ${max} caracteres A-Z, 0-9 o guion bajo, empezando por letra.`);
    }
    result[key] = value;
  }
  for (const key of FECHAS) {
    const value = String(draft[key] ?? '').trim();
    if (!value) continue;
    fechaValida(value, key);
    result[key] = value;
  }
  if (result.fecha_desde && result.fecha_hasta && result.fecha_desde > result.fecha_hasta) {
    throw new Error('La fecha inicial no puede ser posterior a la final.');
  }
  return result;
}

export function paginasAuditoria(total, limite) {
  if (!Number.isSafeInteger(Number(total)) || Number(total) < 0 || !Number.isInteger(limite) || limite < 1) return 0;
  return Math.ceil(Number(total) / limite);
}

export function rangoAuditoria(desde, cantidad) {
  return cantidad ? `${desde + 1}–${desde + cantidad}` : '0';
}

// Solo texto seguro: React renderiza el contenido de <pre> como texto, sin HTML.
export function textoSnapshot(value) {
  if (value === null || value === undefined) return 'Sin datos registrados.';
  if (typeof value === 'string') return value || '(texto vacío)';
  try { return JSON.stringify(value, null, 2); }
  catch { return '[Datos no representables como texto]'; }
}

export function sucursalAuditoria(nombre, id) {
  return id == null ? 'Operación global (sin sucursal)' : (nombre || `Sucursal ID ${id}`);
}

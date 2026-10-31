import { ROLES } from './access.js';
import { aNumeroEntero } from './catalogos.js';

export const ESTADOS_SOLICITUD = Object.freeze(['PENDIENTE', 'CONFIRMADA', 'DESPACHADA', 'ENTREGADA', 'CANCELADA']);
export const FORMAS_PAGO = Object.freeze(['EFECTIVO', 'TARJETA']);
export const ETIQUETAS_SOLICITUD = Object.freeze({
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', DESPACHADA: 'Despachada',
  ENTREGADA: 'Entregada', CANCELADA: 'Cancelada'
});

export function puedeCrearSolicitud(usuario) { return usuario?.rol === ROLES.COORD; }
export function puedeVerOpciones(usuario) { return [ROLES.COORD, ROLES.ADMIN].includes(usuario?.rol); }
export function accionSolicitud(usuario, solicitud) {
  if (!usuario || !solicitud) return [];
  const estado = solicitud.estado;
  if (usuario.rol === ROLES.COORD) {
    if (estado === 'PENDIENTE') return ['confirmar', 'cancelar'];
    if (estado === 'CONFIRMADA') return ['cancelar'];
    if (estado === 'DESPACHADA') return ['entregar'];
    return [];
  }
  if (usuario.rol === ROLES.ENCARGADO &&
      Number(usuario.id_sucursal) > 0 &&
      Number(usuario.id_sucursal) === Number(solicitud.id_sucursal_asignada)) {
    if (estado === 'CONFIRMADA') return ['despachar'];
    if (estado === 'DESPACHADA') return ['entregar'];
  }
  return [];
}
export function validarTexto(valor, nombre, max) {
  const limpio = String(valor ?? '').trim();
  if (!limpio || limpio.length > max) throw new Error(`${nombre} debe tener entre 1 y ${max} caracteres.`);
  return limpio;
}
export function detallesPayload(detalles, medicamentos) {
  if (!Array.isArray(detalles) || detalles.length < 1 || detalles.length > 20) {
    throw new Error('La solicitud debe contener entre 1 y 20 medicamentos.');
  }
  const existentes = new Map(medicamentos.map(m => [Number(m.id_medicamento), m]));
  const vistos = new Set();
  return detalles.map(d => {
    const id_medicamento = aNumeroEntero(d.id_medicamento, 'Medicamento');
    const cantidad = aNumeroEntero(d.cantidad, 'Cantidad');
    const medicamento = existentes.get(id_medicamento);
    if (!medicamento) throw new Error(`El medicamento #${id_medicamento} no está en el catálogo cargado.`);
    if (medicamento.activo !== 'S') throw new Error(`El medicamento #${id_medicamento} está inactivo.`);
    if (vistos.has(id_medicamento)) throw new Error('No se permite repetir un medicamento en la solicitud.');
    vistos.add(id_medicamento);
    return { id_medicamento, cantidad };
  }).sort((a, b) => a.id_medicamento - b.id_medicamento);
}
export function disponibilidadPayload(form, medicamentos) {
  return {
    departamento_entrega: validarTexto(form.departamento_entrega, 'Departamento', 80),
    municipio_entrega: validarTexto(form.municipio_entrega, 'Municipio', 80),
    detalles: detallesPayload(form.detalles, medicamentos)
  };
}
export function solicitudPayload(form, medicamentos, usuario) {
  if (!puedeCrearSolicitud(usuario)) throw new Error('Solo el coordinador de entregas puede registrar solicitudes.');
  return {
    cliente_nombre: validarTexto(form.cliente_nombre, 'Nombre del cliente', 120),
    cliente_telefono: validarTexto(form.cliente_telefono, 'Teléfono del cliente', 20),
    direccion_entrega: validarTexto(form.direccion_entrega, 'Dirección', 250),
    ...disponibilidadPayload(form, medicamentos)
  };
}
export function confirmacionPayload(form, opciones, usuario, solicitud) {
  if (usuario?.rol !== ROLES.COORD || solicitud?.estado !== 'PENDIENTE') {
    throw new Error('Solo el coordinador puede confirmar una solicitud pendiente.');
  }
  const id_sucursal = aNumeroEntero(form.id_sucursal, 'Sucursal');
  if (!Array.isArray(opciones) || !opciones.some(s => Number(s.id_sucursal) === id_sucursal)) {
    throw new Error('Selecciona una sucursal elegible de las opciones consultadas.');
  }
  if (!FORMAS_PAGO.includes(form.forma_pago)) throw new Error('Forma de pago inválida.');
  return { id_sucursal, forma_pago: form.forma_pago };
}
export function tiempoEstimadoEtiqueta(minutos) {
  const n = Number(minutos);
  return Number.isSafeInteger(n) && n > 0 ? `${n} minutos estimados` : 'Tiempo no disponible';
}

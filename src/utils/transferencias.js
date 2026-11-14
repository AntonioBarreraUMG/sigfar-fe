import { ROLES } from './access.js';
import { aNumeroEntero } from './catalogos.js';

export const ESTADOS_TRANSFERENCIA = Object.freeze(['REGISTRADA', 'EN_TRANSITO', 'RECIBIDA']);
export const ETIQUETAS_TRANSFERENCIA = Object.freeze({
  REGISTRADA: 'Registrada',
  EN_TRANSITO: 'En tránsito',
  RECIBIDA: 'Recibida',
});

export function puedeConsultarTransferencias(rol) {
  return rol === ROLES.ADMIN || rol === ROLES.ENCARGADO;
}

export function puedeCrearTransferencia(usuario) {
  return (
    usuario?.rol === ROLES.ENCARGADO &&
    Number.isSafeInteger(Number(usuario.id_sucursal)) &&
    Number(usuario.id_sucursal) > 0
  );
}

export function accionPermitida(usuario, transferencia) {
  if (!puedeCrearTransferencia(usuario) || !transferencia) return null;
  const propia = Number(usuario.id_sucursal);
  if (transferencia.estado === 'REGISTRADA' && propia === Number(transferencia.id_sucursal_origen))
    return 'despachar';
  if (
    transferencia.estado === 'EN_TRANSITO' &&
    propia === Number(transferencia.id_sucursal_destino)
  )
    return 'recibir';
  return null;
}

export function puedeConsultarDetalle(usuario, transferencia) {
  if (usuario?.rol === ROLES.ADMIN) return true;
  if (!puedeCrearTransferencia(usuario) || !transferencia) return false;
  return (
    Number(transferencia.id_sucursal_origen) === Number(usuario.id_sucursal) ||
    Number(transferencia.id_sucursal_destino) === Number(usuario.id_sucursal)
  );
}

export function transferenciaPayload(form, usuario, medicamentos = []) {
  if (!puedeCrearTransferencia(usuario))
    throw new Error('Solo el encargado puede registrar transferencias.');
  const origen = aNumeroEntero(form.id_sucursal_origen, 'Sucursal origen');
  if (origen !== Number(usuario.id_sucursal))
    throw new Error('Solo puedes enviar medicamentos desde tu propia sucursal.');
  const destino = aNumeroEntero(form.id_sucursal_destino, 'Sucursal destino');
  if (origen === destino) throw new Error('Selecciona una sucursal destino diferente del origen.');
  // El backend no permite al encargado enumerar sucursales ajenas.
  // La sucursal destino se captura por ID y su existencia/estado los comprueba Oracle.
  if (!Array.isArray(form.detalles) || form.detalles.length < 1 || form.detalles.length > 50) {
    throw new Error('La transferencia necesita entre 1 y 50 medicamentos.');
  }
  const utilizados = new Set();
  const detalles = form.detalles.map((item, i) => {
    const id_medicamento = aNumeroEntero(item.id_medicamento, `Medicamento ${i + 1}`);
    const cantidad = aNumeroEntero(item.cantidad, `Cantidad del medicamento ${i + 1}`);
    if (
      !medicamentos.some((m) => Number(m.id_medicamento) === id_medicamento && m.activo === 'S')
    ) {
      throw new Error(`El medicamento ${i + 1} no existe o está inactivo.`);
    }
    if (utilizados.has(id_medicamento))
      throw new Error('Un medicamento no puede repetirse en la transferencia.');
    utilizados.add(id_medicamento);
    return { id_medicamento, cantidad };
  });
  detalles.sort((a, b) => a.id_medicamento - b.id_medicamento);
  return { id_sucursal_origen: origen, id_sucursal_destino: destino, detalles };
}

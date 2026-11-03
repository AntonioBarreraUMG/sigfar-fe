import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal } from './Modal.jsx';
import { Icon } from './Icon.jsx';

/** Confirmación explícita, no bloqueante, sin window.confirm y sin cambiar la API. */
export function useConfirmation() {
  const [pending, setPending] = useState(null);
  const resolver = useRef(null);
  const requestConfirmation = useCallback(({ title = 'Confirmar operación', message, confirmText = 'Confirmar', danger = false }) => {
    // No permitir que solicitudes simultáneas reemplacen una confirmación pendiente.
    if (resolver.current) return Promise.resolve(false);
    return new Promise(resolve => {
      resolver.current = resolve;
      setPending({ title, message, confirmText, danger });
    });
  }, []);
  const settle = useCallback(accepted => {
    const resolve = resolver.current;
    resolver.current = null;
    setPending(null);
    resolve?.(accepted);
  }, []);
  useEffect(() => () => {
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(false);
  }, []);
  const confirmationModal = pending ? <Modal variant="confirmation" title={pending.title} subtitle="Comprueba los datos antes de continuar." onClose={() => settle(false)} closeLabel="Cancelar confirmación">
    <div className="sigfar-confirm-message"><Icon name="alert" size={22}/><p>{pending.message}</p></div>
    <div className="data-form-actions">
      <button type="button" className="button button--secondary" onClick={() => settle(false)}>Volver</button>
      <button type="button" data-modal-initial className={`button ${pending.danger ? 'sigfar-button-danger' : 'button--primary'}`} onClick={() => settle(true)}>{pending.confirmText}</button>
    </div>
  </Modal> : null;
  return { requestConfirmation, confirmationModal };
}

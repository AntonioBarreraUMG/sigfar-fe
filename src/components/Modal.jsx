import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

// Modal accesible sin librerías adicionales: portal, foco inicial, Tab cíclico,
// cierre por Escape, restauración de foco y bloqueo de scroll.
let abiertos = 0;
let overflowOriginal = '';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  variant = 'default',
  closeLabel = 'Cerrar',
  locked = false,
}) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const lockedRef = useRef(locked);
  closeRef.current = onClose;
  lockedRef.current = locked;

  useEffect(() => {
    const anterior = document.activeElement;
    if (!abiertos) overflowOriginal = document.body.style.overflow;
    abiertos += 1;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const foco =
      panel?.querySelector('[data-modal-initial]') ||
      (variant !== 'confirmation' &&
        panel?.querySelector(
          '.sigfar-modal-body input:not([disabled]):not([readonly]), .sigfar-modal-body select:not([disabled]), .sigfar-modal-body textarea:not([disabled])',
        )) ||
      panel?.querySelector(FOCUSABLE) ||
      panel;
    foco?.focus();
    function teclado(event) {
      // Los diálogos de confirmación anidados tienen prioridad frente al modal padre.
      if (
        variant !== 'confirmation' &&
        document.querySelector('[data-sigfar-modal="confirmation"]')
      )
        return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!lockedRef.current) closeRef.current?.();
      }
      if (event.key !== 'Tab' || !panel) return;
      const elementos = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      );
      if (!elementos.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === primero || document.activeElement === panel)
      ) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener('keydown', teclado, true);
    return () => {
      document.removeEventListener('keydown', teclado, true);
      abiertos = Math.max(0, abiertos - 1);
      if (!abiertos) document.body.style.overflow = overflowOriginal;
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
    };
  }, [variant]);

  return createPortal(
    <div
      className={`sigfar-modal-backdrop sigfar-modal-backdrop--${variant}`}
      data-sigfar-modal={variant}
    >
      <section
        ref={panelRef}
        tabIndex={-1}
        className={`sigfar-modal sigfar-modal--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <header className="sigfar-modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={subtitleId}>{subtitle}</p>}
          </div>
          {!locked && (
            <button type="button" className="icon-button" aria-label={closeLabel} onClick={onClose}>
              <Icon name="close" size={20} />
            </button>
          )}
        </header>
        <div className="sigfar-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}

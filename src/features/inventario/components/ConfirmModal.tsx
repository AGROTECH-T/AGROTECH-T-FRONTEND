/**
 * Aviso centrado para confirmar una salida.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { createPortal } from "react-dom";

type Props = {
  text: string;
  confirmLabel: string;
  closeLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Pregunta una sola vez, en el centro de la pantalla.
 */
export function ConfirmModal({ text, confirmLabel, closeLabel = "Seguir", onConfirm, onClose }: Readonly<Props>) {
  const root = globalThis.document?.body;
  if (!root) return null;
  return createPortal(
    <div className="inv-modal" role="presentation" onClick={onClose}>
      <div
        className="inv-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar"
        onClick={(event) => event.stopPropagation()}
      >
        <p>{text}</p>
        <div className="inv-form__actions">
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    root,
  );
}

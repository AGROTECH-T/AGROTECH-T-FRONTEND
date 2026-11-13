/**
 * Ventana encima de la pantalla actual.
 *
 * Propósito: crear sin salir de la lista, y poder cerrarla.
 * @author Cristian Deysdayr Jimenez
 */

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

/**
 * Capa oscura y tarjeta centrada, con cierre.
 * @param props - Título, cierre y contenido.
 * @returns Ventana modal.
 */
export function FormWindow({ title, onClose, children, wide = false }: Readonly<Props>) {
  const root = globalThis.document?.body;
  if (!root) return null;
  return createPortal(
    <div className="form-window">
      <button type="button" className="form-window__shade" aria-label="Cerrar ventana" onClick={onClose} />
      <dialog open className={wide ? "form-window__card is-wide" : "form-window__card"} aria-labelledby="form-window-title">
        <header className="form-window__head">
          <h2 id="form-window-title">{title}</h2>
          <button type="button" className="form-window__x" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </dialog>
    </div>,
    root,
  );
}

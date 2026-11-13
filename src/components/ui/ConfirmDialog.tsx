/**
 * Diálogo de confirmación.
 *
 * Propósito: pedir confirmación antes de una acción sensible, con el mismo
 * relieve neomórfico del resto de la app.
 * Contexto: reemplaza a window.confirm de forma progresiva.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Texto del botón mientras la acción está en curso. */
  pendingLabel?: string;
  /** Estado de carga controlado por el llamador. */
  loading?: boolean;
  /** Usa el botón de peligro y el título de advertencia. */
  tone?: "default" | "warning";
  /** Mensaje de error a mostrar dentro del diálogo. */
  error?: string;
  /** Puede devolver una promesa; mientras dure, el diálogo queda bloqueado. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Crea un candado que impide ejecutar una acción dos veces a la vez.
 * @returns Función que ejecuta la acción solo si no hay otra en curso.
 */
export function createSubmitGuard() {
  let busy = false;
  return async function run(action: () => void | Promise<void>): Promise<boolean> {
    if (busy) return false;
    busy = true;
    try {
      await action();
      return true;
    } finally {
      busy = false;
    }
  };
}

/**
 * Ventana modal con título, descripción y dos acciones.
 * @param props - Contenido, estado y callbacks.
 * @returns El diálogo, o null si está cerrado.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pendingLabel = "Procesando...",
  loading = false,
  tone = "default",
  error = "",
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const ref = useRef<HTMLDialogElement>(null);
  const guard = useRef(createSubmitGuard());
  const [running, setRunning] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const busy = loading || running;

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    void guard.current(async () => {
      setRunning(true);
      try {
        await onConfirm();
      } finally {
        setRunning(false);
      }
    });
  };

  const className = tone === "warning" ? "confirm-dialog is-warning" : "confirm-dialog";

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy}
      onCancel={(event) => {
        // Esc: se cierra solo si no hay una operación en curso.
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={titleId} className="confirm-dialog__title">
        {title}
      </h2>
      {description ? (
        <div id={descriptionId} className="confirm-dialog__body">
          {description}
        </div>
      ) : null}
      {error ? (
        <p className="farm-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="confirm-dialog__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === "warning" ? "btn-danger" : "btn-primary"}
          onClick={confirm}
          disabled={busy}
          autoFocus
        >
          {busy ? pendingLabel : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

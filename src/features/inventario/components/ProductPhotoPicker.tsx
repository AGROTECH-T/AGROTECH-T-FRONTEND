/**
 * Foto del producto.
 *
 * Propósito: tomar, cargar, ver o eliminar la foto con el mismo diseño
 * al crear y al editar.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { CameraShot, PhotoLight } from "./ProductView.tsx";

type Props = {
  preview: string;
  busy?: boolean;
  canRemove?: boolean;
  hint?: string;
  onPick: (file: File | undefined) => void;
  onRemove: () => void;
};

const DEFAULT_HINT = "Agrega una foto para reconocerlo rápido en la lista. Es opcional.";

/**
 * Bloque de foto con vista previa y sus tres acciones.
 * @param props - Foto, estado de guardado y acciones.
 * @returns Recuadro de foto y ventanas de cámara o vista ampliada.
 */
export function ProductPhotoPicker({
  preview,
  busy = false,
  canRemove = true,
  hint = DEFAULT_HINT,
  onPick,
  onRemove,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);

  return (
    <>
      <div className="inv-photo">
        {preview ? (
          <button
            type="button"
            className="inv-photo__frame"
            onClick={() => setOpen(true)}
            aria-label="Ver la foto del producto"
          >
            <img src={preview} alt="Foto del producto" />
          </button>
        ) : (
          <div className="inv-photo__frame is-empty">Sin foto</div>
        )}
        <div className="inv-photo__side">
          <p className="inv-photo__hint">{hint}</p>
          <div className="inv-photo__actions">
            <button type="button" disabled={busy} onClick={() => setCamera(true)}>
              Tomar foto
            </button>
            <label>
              Cargar foto
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(event) => {
                  onPick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {preview && canRemove ? (
              <button type="button" disabled={busy} onClick={onRemove}>
                Eliminar foto
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {open && preview ? (
        <PhotoLight src={preview} alt="Foto del producto" onClose={() => setOpen(false)} />
      ) : null}
      {camera ? (
        <CameraShot
          onClose={() => setCamera(false)}
          onShot={(file) => {
            setCamera(false);
            onPick(file);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Aviso de cookies, una sola vez por navegador.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { PolicyWindow } from "./PolicyWindow.tsx";

const KEY = "agrotech.cookies";

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Si el navegador bloquea el almacenamiento, el aviso se cierra igual.
  }
}

/**
 * Tarjeta fija hasta que la persona la cierra.
 * @returns Aviso de cookies o nada si ya se vio.
 */
export function CookieNotice() {
  const [open, setOpen] = useState(() => !alreadySeen());
  const [more, setMore] = useState(false);
  if (!open) return more ? <PolicyWindow part="cookies" onClose={() => setMore(false)} /> : null;

  const close = () => {
    remember();
    setOpen(false);
  };

  return (
    <>
      <aside className="cookie-notice" aria-label="Cookies">
        <header className="cookie-notice__head">
          <p>Cookies</p>
          <button type="button" className="cookie-notice__x" aria-label="Cerrar" onClick={close}>
            ×
          </button>
        </header>
        <p>
          Este sitio no usa cookies de seguimiento ni de publicidad. Solo guarda
          en este navegador lo necesario para la sesión y para volver a abrir
          tu inventario.
        </p>
        <div className="cookie-notice__actions">
          <button type="button" className="cookie-notice__more" onClick={() => setMore(true)}>
            Más información
          </button>
          <button type="button" className="cookie-notice__ok" onClick={close}>
            Entendido
          </button>
        </div>
      </aside>
      {more ? <PolicyWindow part="cookies" onClose={() => setMore(false)} /> : null}
    </>
  );
}

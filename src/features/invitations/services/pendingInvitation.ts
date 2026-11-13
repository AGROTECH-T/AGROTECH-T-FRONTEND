/**
 * Invitación pendiente durante la autenticación.
 *
 * Propósito: leer el token del enlace del correo, conservarlo mientras la
 * persona inicia sesión y retirarlo de la URL.
 * Contexto: el backend arma `${FRONTEND_URL}/invitations/accept#token=<token>`
 * (config/frontend_url.py, build_accept_link). El token viaja en el fragmento,
 * así que nunca llega a un servidor. Se guarda solo en sessionStorage (muere
 * con la pestaña) y nunca en localStorage, consola ni mensajes de error.
 * @author Cristian Deysdayr Jimenez
 */

/** Ruta del enlace de aceptación (ACCEPT_PATH en el backend). */
export const ACCEPT_PATH = "/invitations/accept";

/** Clave de sessionStorage para el token pendiente. */
export const PENDING_INVITATION_KEY = "agrotech.pendingInvitation";

/** Subconjunto de Storage que se usa (permite inyectar un doble en pruebas). */
export type TokenStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Ubicación mínima necesaria para leer el enlace. */
export type InvitationLocation = { pathname: string; hash: string };

/** Historial mínimo necesario para limpiar la URL. */
export type InvitationHistory = Pick<History, "replaceState">;

function defaultStorage(): TokenStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Indica si la ruta es la de aceptación (con o sin barra final).
 * @param pathname - window.location.pathname.
 */
export function isAcceptPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === ACCEPT_PATH;
}

/**
 * Extrae el token del fragmento `#token=...` sin recortarlo.
 * @param hash - window.location.hash (con o sin `#`).
 * @returns Token, o null si falta o está vacío.
 */
export function parseInvitationToken(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const token = new URLSearchParams(raw).get("token");
  return token ? token : null;
}

/**
 * Devuelve el token pendiente guardado en la pestaña.
 * @param storage - Almacenamiento de sesión (por defecto sessionStorage).
 */
export function readPendingInvitation(storage: TokenStorage | null = defaultStorage()): string | null {
  try {
    const token = storage?.getItem(PENDING_INVITATION_KEY) ?? "";
    return token ? token : null;
  } catch {
    return null;
  }
}

/**
 * Guarda el token pendiente en la pestaña.
 * @param token - Token del enlace.
 * @param storage - Almacenamiento de sesión.
 */
export function savePendingInvitation(
  token: string,
  storage: TokenStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(PENDING_INVITATION_KEY, token);
  } catch {
    // Sin almacenamiento disponible el token solo vive en memoria.
  }
}

/**
 * Olvida el token pendiente (aceptado o ya inutilizable).
 * @param storage - Almacenamiento de sesión.
 */
export function clearPendingInvitation(storage: TokenStorage | null = defaultStorage()): void {
  try {
    storage?.removeItem(PENDING_INVITATION_KEY);
  } catch {
    // Nada que limpiar.
  }
}

/**
 * Toma la invitación del enlace actual o, si no hay, la ya guardada.
 *
 * Si la URL es la de aceptación, guarda el token y reemplaza la entrada del
 * historial por "/" para que el token no quede visible ni se reenvíe al
 * recargar. Es idempotente: una segunda llamada (StrictMode, recarga) ya no
 * encuentra el token en la URL y devuelve el guardado.
 * @returns Token pendiente, o null si no hay invitación.
 */
export function takePendingInvitation(
  location: InvitationLocation | null = globalThis.location ?? null,
  history: InvitationHistory | null = globalThis.history ?? null,
  storage: TokenStorage | null = defaultStorage(),
): string | null {
  if (location && isAcceptPath(location.pathname)) {
    const token = parseInvitationToken(location.hash);
    if (token) savePendingInvitation(token, storage);
    try {
      history?.replaceState(null, "", "/");
    } catch {
      // Si el historial no se puede tocar, el flujo sigue igual.
    }
    if (token) return token;
  }
  return readPendingInvitation(storage);
}

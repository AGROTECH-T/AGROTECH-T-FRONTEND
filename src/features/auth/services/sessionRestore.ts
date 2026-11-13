/**
 * Restauración de la sesión al recargar.
 *
 * Propósito: recuperar la cuenta a partir del token que ya vive en la pestaña,
 * sin abrir una sesión nueva.
 * Contexto: el login guarda el JWE en sessionStorage (session.ts). La SPA se
 * autentica solo con Bearer: fetch no envía cookies al backend (otro origen),
 * así que la sesión Django que también abre el login no se usa aquí. Al
 * recargar se consulta GET /api/v1/auth/me/ con ese token:
 * - 200: cuenta, verificación y capacidades vigentes.
 * - 401: token vencido o revocado; se olvida y se vuelve al acceso.
 * - Red u otro error: no se sabe si la sesión sigue viva; se conserva el token
 *   para reintentar y no se muestra ninguna pantalla autenticada.
 * Nunca se usa localStorage.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Account } from "../types/index.ts";
import { fetchAccount } from "./account.ts";
import { clearToken, readToken } from "./session.ts";

export const SESSION_ENDED_NOTICE = "Tu sesión terminó. Vuelve a iniciar sesión.";
export const RESTORE_FAILED_MESSAGE =
  "No pudimos comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.";

export type RestoreResult =
  | { kind: "none" }
  | { kind: "restored"; account: Account }
  | { kind: "expired" }
  | { kind: "failed"; message: string };

export type RestoreDeps = {
  readToken: () => string;
  fetchAccount: (token: string) => Promise<Account>;
  clearToken: () => void;
};

const DEFAULT_DEPS: RestoreDeps = { readToken, fetchAccount, clearToken };

/**
 * Recupera la cuenta del token guardado en la pestaña.
 * @param deps - Lectura del token, consulta de la cuenta y limpieza (inyectables).
 * @returns Resultado de la restauración.
 */
export async function restoreSession(deps: RestoreDeps = DEFAULT_DEPS): Promise<RestoreResult> {
  const token = deps.readToken();
  if (!token) return { kind: "none" };
  try {
    return { kind: "restored", account: await deps.fetchAccount(token) };
  } catch (cause) {
    if (isApiError(cause, 401)) {
      deps.clearToken();
      return { kind: "expired" };
    }
    return { kind: "failed", message: RESTORE_FAILED_MESSAGE };
  }
}

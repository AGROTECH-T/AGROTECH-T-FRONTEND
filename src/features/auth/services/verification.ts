/**
 * Verificación obligatoria del correo.
 *
 * Propósito: decidir si una cuenta debe verificar su correo, traducir los
 * errores reales del backend y evitar solicitudes duplicadas.
 * Contexto (apps/accounts):
 * - POST /auth/email/verification/ → 200 {ok, wait}; 429 "Podrás pedir otro
 *   código en N segundos." con `wait` (10 s entre envíos) o por el límite de
 *   5 por hora; siempre responde ok aunque el proveedor rechace el correo.
 * - POST /auth/email/verification/confirm/ → 200 {ok}; 401 "codigo invalido"
 *   (también tras 5 intentos fallidos) o 401 "el codigo vencio"; 400 si el
 *   código no tiene seis cifras. El 401 del código no es una sesión vencida.
 * El backend es la autoridad: el acceso solo se concede cuando GET /auth/me
 * devuelve email_verified=true. Este bloqueo es de navegación; no protege la
 * API por sí mismo.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Account } from "../types/index.ts";

/** Pausa local entre envíos (RESEND_WAIT del backend). */
export const RESEND_COOLDOWN_SECONDS = 10;
export const CODE_LENGTH = 6;

export const INVALID_CODE_MESSAGE = "El código no es correcto. Revísalo e inténtalo de nuevo.";
export const EXPIRED_CODE_MESSAGE = "El código venció. Solicita uno nuevo.";
export const SESSION_EXPIRED_MESSAGE = "Tu sesión terminó. Vuelve a iniciar sesión.";
export const INCOMPLETE_CODE_MESSAGE = "Escribe las seis cifras del código.";
export const NETWORK_MESSAGE =
  "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";
export const UNEXPECTED_MESSAGE = "Ocurrió un error inesperado. Inténtalo de nuevo.";
export const NOT_CONFIRMED_MESSAGE =
  "El servidor aún no confirma la verificación del correo. Inténtalo de nuevo.";

/** @returns true si la cuenta debe pasar por la verificación antes de entrar. */
export function needsEmailVerification(account: Pick<Account, "email_verified">): boolean {
  return account.email_verified !== true;
}

export type VerificationErrorKind =
  | "invalid_code"
  | "expired_code"
  | "incomplete_code"
  | "session_expired"
  | "rate_limited"
  | "network"
  | "error";

export type VerificationError = {
  kind: VerificationErrorKind;
  message: string;
  /** Segundos de espera que indica el backend (solo 429). */
  wait?: number;
};

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Traduce un error de solicitud o confirmación sin mostrar el código.
 * @param cause - Error capturado.
 */
export function verificationError(cause: unknown): VerificationError {
  if (isApiError(cause)) {
    const server = normalize(cause.serverMessage);
    if (cause.status === 401 && server === "codigo invalido") {
      return { kind: "invalid_code", message: INVALID_CODE_MESSAGE };
    }
    if (cause.status === 401 && server === "el codigo vencio") {
      return { kind: "expired_code", message: EXPIRED_CODE_MESSAGE };
    }
    if (cause.status === 401) return { kind: "session_expired", message: SESSION_EXPIRED_MESSAGE };
    if (cause.status === 400) return { kind: "incomplete_code", message: INCOMPLETE_CODE_MESSAGE };
    if (cause.status === 429) {
      const raw = cause.extra.wait;
      const wait = typeof raw === "number" && raw > 0 ? Math.ceil(raw) : undefined;
      return { kind: "rate_limited", message: cause.message, wait };
    }
    return { kind: "error", message: UNEXPECTED_MESSAGE };
  }
  return { kind: "network", message: NETWORK_MESSAGE };
}

/**
 * Une los dígitos y comprueba que sean exactamente seis cifras.
 * @returns El código, o null si está incompleto.
 */
export function codeFromDigits(digits: readonly string[]): string | null {
  const code = digits.join("");
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code) ? code : null;
}

/**
 * Envuelve una operación para que las llamadas concurrentes compartan una
 * sola petición (doble clic o efecto repetido de StrictMode).
 * @param action - Operación asíncrona.
 */
export function singleFlight<A extends unknown[], T>(
  action: (...args: A) => Promise<T>,
): (...args: A) => Promise<T> {
  let current: Promise<T> | null = null;
  return (...args: A) => {
    if (current) return current;
    current = action(...args).finally(() => {
      current = null;
    });
    return current;
  };
}

export type VerificationApi = {
  request: (token: string) => Promise<{ ok: boolean; wait: number }>;
  confirm: (token: string, code: string) => Promise<unknown>;
  fetchAccount: (token: string) => Promise<Account>;
};

export type ConfirmResult =
  | { status: "verified"; account: Account }
  | { status: "failed"; error: VerificationError };

/**
 * Confirma el código y vuelve a consultar la cuenta. Solo se considera
 * verificada si el backend devuelve email_verified=true.
 */
export async function confirmAndReload(
  api: VerificationApi,
  token: string,
  code: string,
): Promise<ConfirmResult> {
  try {
    await api.confirm(token, code);
    const account = await api.fetchAccount(token);
    if (account.email_verified === true) return { status: "verified", account };
    return { status: "failed", error: { kind: "error", message: NOT_CONFIRMED_MESSAGE } };
  } catch (cause) {
    return { status: "failed", error: verificationError(cause) };
  }
}

export type RequestResult =
  | { status: "sent"; lifetimeSeconds: number }
  | { status: "failed"; error: VerificationError };

/** Solicita un código e interpreta el resultado. */
export async function requestCode(api: VerificationApi, token: string): Promise<RequestResult> {
  try {
    const result = await api.request(token);
    return { status: "sent", lifetimeSeconds: result.wait };
  } catch (cause) {
    return { status: "failed", error: verificationError(cause) };
  }
}

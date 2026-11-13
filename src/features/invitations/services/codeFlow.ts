/**
 * Flujo de unión a una finca con código de invitación (F10.3.5).
 *
 * Propósito: normalizar el código, traducir las respuestas reales del backend
 * a estados visibles y evitar solicitudes duplicadas.
 * Contexto: preview y accept (apps/farms/views.py, F10.3.3-B) responden:
 * - 200: preview {farm_name, role, expires_at}; accept {farm_id, membership_id, role, status}.
 * - 400: cuerpo sin código o vacío.
 * - 401: sin sesión válida.
 * - 403: cuenta inactiva o correo sin verificar.
 * - 404: genérico (código incorrecto, vencido, cancelado, usado o de otro correo).
 * - 409: la cuenta ya pertenece a la finca.
 * - 429: límite de intentos (5 fallos/15 min por cuenta) o de solicitudes.
 * Los mensajes no revelan datos internos ni repiten el código. El código solo
 * vive en el estado del componente: nunca en sessionStorage ni localStorage.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import { formatDate } from "../../farms/services/date.ts";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { FarmRole } from "../../farms/types/index.ts";
import type { InvitationAcceptResult, InvitationCodePreview } from "../types/index.ts";
import { ALREADY_MEMBER_MESSAGE, NETWORK_MESSAGE } from "./acceptFlow.ts";

/** Longitud máxima del campo (los códigos tienen 11 caracteres con guion). */
export const CODE_MAX_LENGTH = 32;
export const CODE_EMPTY_MESSAGE = "Escribe el código que recibiste.";
export const CODE_INVALID_REQUEST_MESSAGE =
  "Revisa el código y escríbelo tal como aparece en el correo.";
export const CODE_SESSION_MESSAGE =
  "Tu sesión terminó. Vuelve a iniciar sesión para usar el código.";
export const CODE_UNVERIFIED_MESSAGE =
  "Tu cuenta no puede usar códigos de invitación todavía. Verifica tu correo electrónico e inténtalo de nuevo.";
export const CODE_NOT_FOUND_MESSAGE =
  "No encontramos una invitación pendiente para este código y esta cuenta. Revisa el código, " +
  "comprueba que iniciaste sesión con el correo invitado o pide una nueva invitación.";
export const CODE_SERVER_MESSAGE = "Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.";
export const CODE_RATE_LIMIT_MESSAGE = "Límite de intentos alcanzado. Inténtalo más tarde.";

/** Quita espacios y unifica mayúsculas; el backend acepta también el guion. */
export function normalizeInvitationCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type CodeErrorKind =
  | "empty"
  | "invalid_request"
  | "session_expired"
  | "unverified"
  | "not_found"
  | "already_member"
  | "rate_limited"
  | "server"
  | "network";

export type CodeError = { kind: CodeErrorKind; message: string };

/**
 * Traduce un fallo de preview o accept a un estado visible.
 * @param cause - Error capturado (ApiError o fallo de red).
 */
export function codeErrorFrom(cause: unknown): CodeError {
  if (!isApiError(cause)) return { kind: "network", message: NETWORK_MESSAGE };
  switch (cause.status) {
    case 400:
      return { kind: "invalid_request", message: CODE_INVALID_REQUEST_MESSAGE };
    case 401:
      return { kind: "session_expired", message: CODE_SESSION_MESSAGE };
    case 403:
      return { kind: "unverified", message: CODE_UNVERIFIED_MESSAGE };
    case 404:
      return { kind: "not_found", message: CODE_NOT_FOUND_MESSAGE };
    case 409:
      return { kind: "already_member", message: ALREADY_MEMBER_MESSAGE };
    case 429: {
      // ApiError ya traduce el texto del límite; solo se acepta si es ese aviso.
      const text = cause.message.startsWith("Límite de intentos") ? cause.message : CODE_RATE_LIMIT_MESSAGE;
      return { kind: "rate_limited", message: text };
    }
    default:
      return { kind: "server", message: CODE_SERVER_MESSAGE };
  }
}

export type PreviewSummary = { farm: string; role: string; expires: string };

/** @returns Datos de la previsualización listos para mostrar. */
export function previewSummary(preview: InvitationCodePreview): PreviewSummary {
  return {
    farm: preview.farm_name,
    role: roleLabel(preview.role as FarmRole),
    expires: formatDate(preview.expires_at),
  };
}

/** @returns Confirmación tras aceptar. */
export function joinedMessage(preview: InvitationCodePreview, result: InvitationAcceptResult): string {
  return `Te uniste a «${preview.farm_name}» como ${roleLabel(result.role as FarmRole)}.`;
}

export type CodeApi = {
  preview: (code: string) => Promise<InvitationCodePreview>;
  accept: (code: string) => Promise<InvitationAcceptResult>;
};

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: CodeError };

/**
 * Envuelve preview y accept para que cada uno tenga como mucho una solicitud
 * en vuelo: un doble clic o un re-render durante el envío reciben la misma
 * promesa y no generan otra petición.
 * @param api - Llamadas HTTP (inyectables en pruebas).
 */
function singleFlight<T>(call: (code: string) => Promise<T>) {
  let pending: Promise<Outcome<T>> | null = null;
  const run = (raw: string): Promise<Outcome<T>> => {
    const code = normalizeInvitationCode(raw);
    if (!code) {
      return Promise.resolve({ ok: false, error: { kind: "empty", message: CODE_EMPTY_MESSAGE } });
    }
    if (pending) return pending;
    pending = (async (): Promise<Outcome<T>> => {
      try {
        return { ok: true, value: await call(code) };
      } catch (cause) {
        return { ok: false, error: codeErrorFrom(cause) };
      } finally {
        pending = null;
      }
    })();
    return pending;
  };
  return { run, busy: () => pending !== null };
}

export function createCodeRunner(api: CodeApi) {
  const preview = singleFlight(api.preview);
  const accept = singleFlight(api.accept);
  return {
    preview: preview.run,
    accept: accept.run,
    /** @returns true si hay alguna solicitud en curso. */
    busy: (): boolean => preview.busy() || accept.busy(),
  };
}

export type CodeRunner = ReturnType<typeof createCodeRunner>;

/** Pasos del formulario: escribir, comprobar, confirmar, aceptar y unido. */
export type CodeStep = "enter" | "checking" | "confirm" | "accepting" | "joined";

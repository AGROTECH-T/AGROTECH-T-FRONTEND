/**
 * Flujo de aceptación de invitaciones.
 *
 * Propósito: traducir la respuesta real del backend a estados visibles,
 * decidir cuándo olvidar el token y evitar solicitudes duplicadas.
 * Contexto: accept_invitation (apps/farms/invitation_services.py) responde:
 * - 200 con farm_id y membership_id.
 * - 404 "invitación no encontrada" para token inválido, vencido, cancelado,
 *   ya usado, cuenta distinta al correo invitado o correo sin verificar. El
 *   backend no los distingue a propósito; aquí tampoco se adivinan.
 * - 409 "ya perteneces a esta finca"; 401 sin sesión; 429 por frecuencia.
 * Ningún mensaje incluye el token. Tras el 200 el token se olvida; si la
 * respuesta se perdió (p. ej. recarga), un reintento recibe 404 porque la
 * invitación ya no está pendiente y la finca aparece en el listado.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { AcceptState, InvitationAcceptResult } from "../types/index.ts";
import { clearPendingInvitation, type TokenStorage } from "./pendingInvitation.ts";

export const INVALID_INVITATION_MESSAGE =
  "No pudimos aceptar esta invitación. Puede que el enlace no sea válido, que la " +
  "invitación haya vencido, se haya cancelado o ya se haya usado, o que esta cuenta " +
  "no corresponda al correo invitado o aún no lo tenga verificado.";
export const ALREADY_MEMBER_MESSAGE = "Ya perteneces a esta finca.";
export const SESSION_EXPIRED_MESSAGE =
  "Tu sesión terminó. Vuelve a iniciar sesión para aceptar la invitación.";
export const NETWORK_MESSAGE =
  "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";
export const UNEXPECTED_MESSAGE =
  "Ocurrió un error inesperado al aceptar la invitación. Inténtalo de nuevo.";
export const ACCEPTED_MESSAGE = "Invitación aceptada. Ya formas parte de la finca.";

export type AcceptOutcome = AcceptState & {
  /** true si el token ya no sirve y debe olvidarse. */
  forgetToken: boolean;
};

/** @returns Estado de éxito a partir de la respuesta 200. */
export function acceptedOutcome(result: InvitationAcceptResult): AcceptOutcome {
  return {
    kind: "accepted",
    message: ACCEPTED_MESSAGE,
    farmId: result.farm_id,
    forgetToken: true,
  };
}

/**
 * Traduce un error de la aceptación a un estado visible.
 * Solo 400 y 409 prueban que el token ya no sirve y lo olvidan. El 404 se
 * conserva: puede significar cuenta equivocada o correo sin verificar, y la
 * persona necesita el token para ingresar con la cuenta correcta. Se olvida
 * cuando ella descarta la invitación. Red, 401, 429 y 5xx también lo conservan
 * para reintentar.
 */
export function acceptOutcomeFromError(cause: unknown): AcceptOutcome {
  if (isApiError(cause)) {
    if (cause.status === 404) {
      return { kind: "invalid", message: INVALID_INVITATION_MESSAGE, forgetToken: false };
    }
    if (cause.status === 400) {
      return { kind: "invalid", message: INVALID_INVITATION_MESSAGE, forgetToken: true };
    }
    if (cause.status === 409) {
      return { kind: "already_member", message: ALREADY_MEMBER_MESSAGE, forgetToken: true };
    }
    if (cause.status === 401) {
      return { kind: "session_expired", message: SESSION_EXPIRED_MESSAGE, forgetToken: false };
    }
    if (cause.status === 429) {
      return { kind: "rate_limited", message: cause.message, forgetToken: false };
    }
    return { kind: "error", message: UNEXPECTED_MESSAGE, forgetToken: false };
  }
  return { kind: "network", message: NETWORK_MESSAGE, forgetToken: false };
}

export type AcceptRunner = (token: string) => Promise<AcceptOutcome>;

/**
 * Crea un ejecutor de aceptación de un solo vuelo.
 *
 * Mientras una solicitud está en curso, cualquier llamada adicional (doble
 * clic, efecto repetido de StrictMode) recibe la misma promesa y no dispara
 * otra petición. Tras un resultado definitivo se reutiliza ese resultado.
 * @param accept - Llamada HTTP (inyectable en pruebas).
 * @param storage - Almacenamiento del token pendiente.
 */
export function createAcceptRunner(
  accept: (token: string) => Promise<InvitationAcceptResult>,
  storage?: TokenStorage | null,
): AcceptRunner {
  let inFlight: Promise<AcceptOutcome> | null = null;
  let settled: AcceptOutcome | null = null;

  return function run(token: string): Promise<AcceptOutcome> {
    if (settled) return Promise.resolve(settled);
    if (inFlight) return inFlight;
    inFlight = (async () => {
      let outcome: AcceptOutcome;
      try {
        outcome = acceptedOutcome(await accept(token));
      } catch (cause) {
        outcome = acceptOutcomeFromError(cause);
      }
      if (outcome.forgetToken) {
        clearPendingInvitation(storage);
        settled = outcome;
      }
      inFlight = null;
      return outcome;
    })();
    return inFlight;
  };
}

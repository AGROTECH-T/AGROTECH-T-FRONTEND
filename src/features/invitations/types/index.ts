/**
 * Contratos de la aceptación de invitaciones.
 *
 * Propósito: nombrar el cuerpo y la respuesta de POST /api/v1/invitations/accept/.
 * Contexto: InvitationAcceptSerializer e InvitationAcceptResponseSerializer.
 * @author Cristian Deysdayr Jimenez
 */

/** Cuerpo exacto que exige el backend: el token sin recortar. */
export type InvitationAcceptRequest = {
  token: string;
};

/** Respuesta 200: la membresía creada o reactivada. */
export type InvitationAcceptResult = {
  farm_id: number;
  membership_id: number;
  role: string;
  status: string;
};

/** Cuerpo de POST /api/v1/invitations/code/{preview,accept}/ (F10.3.5). */
export type InvitationCodeRequest = {
  code: string;
};

/** Respuesta 200 de la previsualización por código: solo lo necesario para confirmar. */
export type InvitationCodePreview = {
  farm_name: string;
  role: string;
  expires_at: string;
};

/** Estados visibles de la pantalla de aceptación. */
export type AcceptStateKind =
  | "ready"
  | "accepting"
  | "accepted"
  | "invalid"
  | "already_member"
  | "session_expired"
  | "rate_limited"
  | "network"
  | "error";

export type AcceptState = {
  kind: AcceptStateKind;
  message: string;
  farmId?: number;
};

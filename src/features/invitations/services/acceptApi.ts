/**
 * Cliente HTTP de la aceptación de invitaciones.
 *
 * Propósito: llamar a POST /api/v1/invitations/accept/ con la sesión vigente.
 * Contexto: FarmInvitationAcceptView. El cuerpo solo lleva `token`, sin
 * recortar (trim_whitespace=False).
 * @author Cristian Deysdayr Jimenez
 */

import { postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { InvitationAcceptRequest, InvitationAcceptResult } from "../types/index.ts";

export const ACCEPT_ENDPOINT = "/api/v1/invitations/accept/";

/**
 * Acepta la invitación con la cuenta autenticada.
 * @param token - Token del enlace del correo.
 * @returns Membresía resultante.
 */
export function acceptInvitation(token: string): Promise<InvitationAcceptResult> {
  const body: InvitationAcceptRequest = { token };
  return postJson<InvitationAcceptResult>(ACCEPT_ENDPOINT, body, readToken());
}

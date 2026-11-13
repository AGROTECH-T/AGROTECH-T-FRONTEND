/**
 * Cliente HTTP de las invitaciones por código (F10.3.5).
 *
 * Propósito: llamar a POST /api/v1/invitations/code/preview/ y
 * /code/accept/ con la sesión vigente.
 * Contexto: FarmInvitationCodePreviewView y FarmInvitationCodeAcceptView. El
 * cuerpo solo lleva `code`; la identidad sale de la sesión, nunca del cuerpo.
 * El código no se guarda en ningún almacenamiento del navegador.
 * @author Cristian Deysdayr Jimenez
 */

import { postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type {
  InvitationAcceptResult,
  InvitationCodePreview,
  InvitationCodeRequest,
} from "../types/index.ts";

export const CODE_PREVIEW_ENDPOINT = "/api/v1/invitations/code/preview/";
export const CODE_ACCEPT_ENDPOINT = "/api/v1/invitations/code/accept/";

/**
 * Muestra finca, rol y vencimiento del código sin consumirlo.
 * @param code - Código tal como lo escribió la persona (ya normalizado).
 */
export function previewInvitationCode(code: string): Promise<InvitationCodePreview> {
  const body: InvitationCodeRequest = { code };
  return postJson<InvitationCodePreview>(CODE_PREVIEW_ENDPOINT, body, readToken());
}

/**
 * Acepta la invitación del código con la cuenta autenticada.
 * @param code - Código confirmado tras la previsualización.
 * @returns Membresía creada o reactivada.
 */
export function acceptInvitationCode(code: string): Promise<InvitationAcceptResult> {
  const body: InvitationCodeRequest = { code };
  return postJson<InvitationAcceptResult>(CODE_ACCEPT_ENDPOINT, body, readToken());
}

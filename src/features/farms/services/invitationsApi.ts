/**
 * Cliente HTTP de invitaciones a fincas.
 *
 * Propósito: listar, crear, reenviar, cambiar el rol y cancelar invitaciones
 * de una finca (solo administrador).
 * Contexto: FARMS-108 bajo /api/v1/farms/{id}/invitations/. El listado es un
 * arreglo sin paginar; la creación solo acepta `email` y `role`. Ninguna
 * respuesta incluye el token: el frontend nunca lo recibe ni lo genera.
 * @author Cristian Deysdayr Jimenez
 */

import { deleteJson, getJson, patchJson, postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { FarmInvitation, FarmRole, InvitationCreateRequest } from "../types/index.ts";

const invitationsPath = (farmId: number) => `/api/v1/farms/${farmId}/invitations/`;

/**
 * Lista las invitaciones de la finca (el backend expira antes las vencidas).
 * @param farmId - Identificador de la finca.
 * @returns Invitaciones, de la más reciente a la más antigua.
 */
export function listInvitations(farmId: number): Promise<FarmInvitation[]> {
  return getJson<FarmInvitation[]>(invitationsPath(farmId), readToken());
}

/**
 * Crea una invitación y dispara el envío del correo.
 * Un 502 significa que la invitación SÍ quedó creada (pendiente) pero el
 * proveedor rechazó el correo; el ApiError trae `invitation_id`.
 * @param farmId - Identificador de la finca.
 * @param request - Correo y rol del destinatario.
 * @returns Invitación creada.
 */
export function createInvitation(
  farmId: number,
  request: InvitationCreateRequest,
): Promise<FarmInvitation> {
  const body: InvitationCreateRequest = { email: request.email, role: request.role };
  return postJson<FarmInvitation>(invitationsPath(farmId), body, readToken());
}

const invitationPath = (farmId: number, invitationId: number) =>
  `${invitationsPath(farmId)}${invitationId}/`;

/**
 * Reenvía una invitación pendiente: el backend rota el token (el enlace
 * anterior deja de valer), renueva la vigencia y envía el correo.
 * Un 502 significa que la invitación sigue pendiente con el token nuevo,
 * pero el proveedor rechazó el correo.
 * @param farmId - Identificador de la finca.
 * @param invitationId - Identificador de la invitación.
 * @returns Invitación actualizada.
 */
export function resendInvitation(farmId: number, invitationId: number): Promise<FarmInvitation> {
  return postJson<FarmInvitation>(
    `${invitationPath(farmId, invitationId)}resend/`,
    {},
    readToken(),
  );
}

/**
 * Cambia el rol de una invitación pendiente (no de una membresía). El backend
 * rota el token, renueva la vigencia y reenvía; un 502 indica que el rol sí
 * cambió pero el correo no salió.
 * @param farmId - Identificador de la finca.
 * @param invitationId - Identificador de la invitación.
 * @param role - Nuevo rol (InvitationRoleSerializer: solo `role`).
 * @returns Invitación actualizada.
 */
export function changeInvitationRole(
  farmId: number,
  invitationId: number,
  role: FarmRole,
): Promise<FarmInvitation> {
  return patchJson<FarmInvitation>(invitationPath(farmId, invitationId), { role }, readToken());
}

/**
 * Cancela una invitación pendiente (204). Su enlace deja de valer.
 * @param farmId - Identificador de la finca.
 * @param invitationId - Identificador de la invitación.
 */
export function cancelInvitation(farmId: number, invitationId: number): Promise<void> {
  return deleteJson(invitationPath(farmId, invitationId), readToken());
}

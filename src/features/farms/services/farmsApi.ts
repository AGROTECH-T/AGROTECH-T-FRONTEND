/**
 * Cliente HTTP de fincas.
 *
 * Propósito: listar, crear, consultar, actualizar y desactivar fincas propias.
 * Contexto: Farms v1 bajo /api/v1/farms/.
 * @author Cristian Deysdayr Jimenez
 */

import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type {
  ChangeMemberRoleRequest,
  Farm,
  FarmMember,
  FarmMembersResponse,
  HistoryPage,
  RevokeMemberRequest,
  TransferAdminResponse,
} from "../types/index.ts";

const FARMS_PATH = "/api/v1/farms/";

/**
 * Lista las fincas donde la cuenta tiene membresía.
 * @returns Fincas propias.
 */
export function listFarms(): Promise<Farm[]> {
  return getJson<Farm[]>(FARMS_PATH, readToken());
}

/**
 * Crea una finca con el nombre indicado.
 * @param name - Nombre de la finca (máx. 100).
 * @returns Finca creada con rol administrador.
 */
export function createFarm(name: string): Promise<Farm> {
  return postJson<Farm>(FARMS_PATH, { name }, readToken());
}

/**
 * Consulta una finca por id si la cuenta pertenece a ella.
 * @param farmId - Identificador de la finca.
 * @returns Detalle de la finca.
 */
export function getFarm(farmId: number): Promise<Farm> {
  return getJson<Farm>(`${FARMS_PATH}${farmId}/`, readToken());
}

/**
 * Actualiza el nombre de una finca (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param name - Nuevo nombre.
 * @returns Finca actualizada.
 */
export function updateFarm(farmId: number, name: string): Promise<Farm> {
  return putJson<Farm>(`${FARMS_PATH}${farmId}/`, { name }, readToken());
}

/**
 * Desactiva una finca mediante baja lógica (solo administrador).
 * @param farmId - Identificador de la finca.
 */
export function deleteFarm(farmId: number): Promise<void> {
  return deleteJson(`${FARMS_PATH}${farmId}/`, readToken());
}

/**
 * Reactiva una finca desactivada (solo administrador; responde 204).
 * @param farmId - Identificador de la finca.
 */
export async function reactivateFarm(farmId: number): Promise<void> {
  await postJson<unknown>(`${FARMS_PATH}${farmId}/reactivate/`, {}, readToken());
}

/**
 * Consulta el historial de auditoría de una finca (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param page - Número de página (por defecto 1).
 * @param pageSize - Tamaño de página (por defecto 20).
 * @returns Página del historial.
 */
export function listFarmHistory(
  farmId: number,
  page = 1,
  pageSize = 20,
): Promise<HistoryPage> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return getJson<HistoryPage>(
    `${FARMS_PATH}${farmId}/history/?${params.toString()}`,
    readToken(),
  );
}

/**
 * Lista los integrantes de una finca (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param status - Filtro de estado (por defecto "active").
 * @param search - Búsqueda por nombre (opcional).
 * @param page - Número de página.
 * @param pageSize - Tamaño de página.
 * @returns Página de integrantes.
 */
export function listFarmMembers(
  farmId: number,
  status = "active",
  search = "",
  page = 1,
  pageSize = 20,
): Promise<FarmMembersResponse> {
  const params = new URLSearchParams({
    status: String(status),
    page: String(page),
    page_size: String(pageSize),
  });
  if (search.trim()) {
    params.set("search", search.trim());
  }
  return getJson<FarmMembersResponse>(
    `${FARMS_PATH}${farmId}/members/?${params.toString()}`,
    readToken(),
  );
}

/**
 * Consulta una membresía (administrador o la propia activa).
 * @param farmId - Identificador de la finca.
 * @param membershipId - Identificador de la membresía.
 */
export function getFarmMember(farmId: number, membershipId: number): Promise<FarmMember> {
  return getJson<FarmMember>(
    `${FARMS_PATH}${farmId}/members/${membershipId}/`,
    readToken(),
  );
}

/**
 * Cambia el rol de una membresía (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param membershipId - Identificador de la membresía.
 * @param role - Nuevo rol.
 */
export function changeMemberRole(
  farmId: number,
  membershipId: number,
  role: ChangeMemberRoleRequest["role"],
): Promise<FarmMember> {
  return patchJson<FarmMember>(
    `${FARMS_PATH}${farmId}/members/${membershipId}/`,
    { role },
    readToken(),
  );
}

/**
 * Revoca una membresía (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param membershipId - Identificador de la membresía.
 * @param reason - Motivo opcional.
 */
export function revokeMember(
  farmId: number,
  membershipId: number,
  reason?: string,
): Promise<void> {
  const body: RevokeMemberRequest = {};
  if (reason) body.reason = reason;
  return deleteJson(
    `${FARMS_PATH}${farmId}/members/${membershipId}/`,
    readToken(),
    body,
  );
}

/**
 * Permite que el usuario autenticado abandone la finca.
 * @param farmId - Identificador de la finca.
 */
export async function leaveFarm(farmId: number): Promise<void> {
  await postJson<unknown>(`${FARMS_PATH}${farmId}/leave/`, {}, readToken());
}

/**
 * Transfiere la administración a otra membresía (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param membershipId - Identificador de la membresía destinataria.
 */
export function transferAdmin(
  farmId: number,
  membershipId: number,
): Promise<TransferAdminResponse> {
  return postJson<TransferAdminResponse>(
    `${FARMS_PATH}${farmId}/members/${membershipId}/transfer/`,
    {},
    readToken(),
  );
}

/**
 * Consulta el historial de auditoría de una membresía (solo administrador).
 * @param farmId - Identificador de la finca.
 * @param membershipId - Identificador de la membresía.
 * @param page - Número de página.
 * @param pageSize - Tamaño de página.
 */
export function listMemberHistory(
  farmId: number,
  membershipId: number,
  page = 1,
  pageSize = 20,
): Promise<HistoryPage> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return getJson<HistoryPage>(
    `${FARMS_PATH}${farmId}/members/${membershipId}/history/?${params.toString()}`,
    readToken(),
  );
}

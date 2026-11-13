/**
 * Cliente HTTP de fincas.
 *
 * Propósito: listar, crear, consultar, actualizar y eliminar fincas propias.
 * Contexto: Farms v1 bajo /api/v1/farms/.
 * @author Cristian Deysdayr Jimenez
 */

import { deleteJson, getJson, postJson, putJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { Farm } from "../types/index.ts";

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
 * Elimina una finca (solo administrador).
 * @param farmId - Identificador de la finca.
 */
export function deleteFarm(farmId: number): Promise<void> {
  return deleteJson(`${FARMS_PATH}${farmId}/`, readToken());
}

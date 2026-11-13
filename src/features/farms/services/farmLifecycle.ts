/**
 * Ciclo de vida de una finca en la interfaz.
 *
 * Propósito: desactivar, reactivar y abandonar una finca, y mantener el
 * listado local coherente con lo que devuelve GET /farms/.
 * Contexto: la visibilidad usa las capacidades del backend (F6) y, si faltan,
 * el rol propio y el estado de la finca; el backend sigue siendo la autoridad
 * (403/404/409).
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Farm } from "../types/index.ts";
import { withLocalChanges } from "./capabilityGuards.ts";

/** Operaciones HTTP que usa el ciclo de vida (inyectables en pruebas). */
export type LifecycleApi = {
  getFarm: (farmId: number) => Promise<Farm>;
  deleteFarm: (farmId: number) => Promise<void>;
  reactivateFarm: (farmId: number) => Promise<void>;
  leaveFarm: (farmId: number) => Promise<void>;
};

type FarmState = Pick<Farm, "role" | "is_active" | "capabilities">;

const isAdmin = (farm: FarmState) => farm.role === "administrador";

// Las capacidades del backend (F6) mandan; el rol solo es respaldo si faltan.

/** Editar el nombre: administrador en finca activa (PUT exige finca activa). */
export function canEditName(farm: FarmState): boolean {
  if (farm.capabilities) return farm.capabilities.can_edit_farm;
  return isAdmin(farm) && farm.is_active;
}

/** Desactivar: administrador; solo tiene sentido si la finca está activa. */
export function canDeactivate(farm: FarmState): boolean {
  if (farm.capabilities) return farm.capabilities.can_deactivate_farm;
  return isAdmin(farm) && farm.is_active;
}

/** Reactivar: administrador sobre una finca desactivada. */
export function canReactivate(farm: FarmState): boolean {
  if (farm.capabilities) return farm.capabilities.can_reactivate_farm;
  return isAdmin(farm) && !farm.is_active;
}

/**
 * Abandonar: cualquier integrante en finca activa. No hay capacidad
 * `can_leave_farm` (DEC-11): mostrar el botón no garantiza que la operación
 * termine; el backend responde 409 si quien sale es el último administrador.
 */
export function canLeave(farm: FarmState): boolean {
  return farm.is_active;
}

/**
 * Relee la finca tras un cambio; si la lectura falla, aplica el cambio
 * conocido sin inventar fechas. El respaldo descarta las capacidades
 * anteriores (calculadas para el estado previo) para que la visibilidad use
 * la regla por rol con el nuevo is_active.
 */
async function refresh(
  api: LifecycleApi,
  farm: Farm,
  fallback: Partial<Farm>,
): Promise<Farm> {
  try {
    return await api.getFarm(farm.id);
  } catch {
    return withLocalChanges(farm, fallback);
  }
}

/**
 * Desactiva la finca y devuelve su estado real (el administrador puede seguir
 * consultándola). Si el DELETE falla, propaga el ApiError.
 */
export async function deactivateFarm(api: LifecycleApi, farm: Farm): Promise<Farm> {
  await api.deleteFarm(farm.id);
  return refresh(api, farm, { is_active: false, deactivated_at: null });
}

/** Reactiva la finca y devuelve su estado real. Propaga el ApiError si falla. */
export async function reactivateFarm(api: LifecycleApi, farm: Farm): Promise<Farm> {
  await api.reactivateFarm(farm.id);
  return refresh(api, farm, { is_active: true, deactivated_at: null });
}

/** Abandona la finca. Solo resuelve si el backend respondió con éxito. */
export async function leaveFarm(api: LifecycleApi, farm: Farm): Promise<void> {
  await api.leaveFarm(farm.id);
}

/**
 * Mensaje para un fallo al abandonar, sin ocultar el texto del backend.
 * En un 409 de administrador añade cómo resolverlo (regla del último admin).
 */
export function leaveErrorMessage(cause: unknown, farm: FarmState): string {
  const base = cause instanceof Error ? cause.message : "No se pudo abandonar la finca";
  if (isApiError(cause, 409) && isAdmin(farm)) {
    return `${base}. Antes de abandonarla, otra persona debe tener el rol de administrador.`;
  }
  return base;
}

/**
 * Aplica una finca actualizada al listado: GET /farms/ solo devuelve fincas
 * activas, así que una finca inactiva sale del listado y una activa entra o
 * se reemplaza, en orden por id.
 */
export function applyFarmToList(list: readonly Farm[], farm: Farm): Farm[] {
  const rest = list.filter((item) => item.id !== farm.id);
  if (!farm.is_active) return rest;
  return [...rest, farm].sort((a, b) => a.id - b.id);
}

/** Quita una finca del listado (p. ej. tras abandonarla). */
export function removeFarmFromList(list: readonly Farm[], farmId: number): Farm[] {
  return list.filter((item) => item.id !== farmId);
}

/**
 * Valida el identificador escrito para abrir una finca directamente.
 * @returns El id entero positivo, o null si no es válido.
 */
export function parseFarmId(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,9}$/.test(trimmed)) return null;
  const id = Number(trimmed);
  return id > 0 ? id : null;
}

/** Mensaje al no poder abrir una finca por id, conservando el del backend. */
export function openByIdErrorMessage(cause: unknown): string {
  if (isApiError(cause, 404)) {
    return (
      "No se encontró la finca. Puede que no exista, que no pertenezcas a ella " +
      "o que esté desactivada y no seas su administrador."
    );
  }
  return cause instanceof Error ? cause.message : "No se pudo abrir la finca";
}

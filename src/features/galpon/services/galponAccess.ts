/**
 * Acceso de lectura/escritura al galpón de una finca.
 *
 * Propósito: decidir si se muestran altas y bitácora editable.
 * Contexto: usa capacidades del backend; sin ellas, respaldo por rol.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm } from "../../farms/types/index.ts";

const WRITE_ROLES: ReadonlySet<Farm["role"]> = new Set(["administrador", "operador"]);

/**
 * @param farm - Finca activa o nula.
 * @returns true si puede registrar eventos / lotes en el galpón.
 */
export function canWriteGalpon(
  farm: Pick<Farm, "role" | "is_active" | "capabilities"> | null | undefined,
): boolean {
  if (!farm) return false;
  if (farm.capabilities) return farm.capabilities.can_write_galpon;
  return farm.is_active && WRITE_ROLES.has(farm.role);
}

/**
 * @param farm - Finca activa o nula.
 * @returns true si puede ver galpones y lotes.
 */
export function canReadGalpon(
  farm: Pick<Farm, "role" | "is_active" | "capabilities"> | null | undefined,
): boolean {
  if (!farm) return false;
  if (farm.capabilities) return farm.capabilities.can_read_galpon;
  return farm.is_active;
}

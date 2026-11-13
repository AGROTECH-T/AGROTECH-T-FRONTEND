/**
 * Filtro del listado de fincas por rol y nombre.
 *
 * Propósito: contar las fincas por rol para el selector y aplicar el filtro
 * elegido junto con la búsqueda por nombre.
 * Contexto: el rol viene de GET /farms/; el filtro es solo de presentación.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm, FarmRole } from "../types/index.ts";

export type RoleFilter = "todas" | FarmRole;

/** Orden fijo de las opciones del selector. */
export const ROLE_FILTERS: readonly RoleFilter[] = ["todas", "administrador", "operador", "consulta"];

/** @returns Cantidad de fincas por opción del selector. */
export function roleCounts(farms: readonly Pick<Farm, "role">[]): Record<RoleFilter, number> {
  const counts: Record<RoleFilter, number> = { todas: farms.length, administrador: 0, operador: 0, consulta: 0 };
  for (const farm of farms) {
    if (farm.role in counts) counts[farm.role] += 1;
  }
  return counts;
}

/** @returns Fincas que coinciden con el rol elegido y contienen el texto buscado. */
export function filterFarms<T extends Pick<Farm, "name" | "role">>(
  farms: readonly T[],
  role: RoleFilter,
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  return farms.filter(
    (farm) =>
      (role === "todas" || farm.role === role) &&
      (!needle || farm.name.toLowerCase().includes(needle)),
  );
}

/** @returns Fecha corta en español (p. ej. «3 nov 2026») o "" si es inválida. */
export function shortDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

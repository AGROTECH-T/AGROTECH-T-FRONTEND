/**
 * Copias locales de una finca sin capacidades obsoletas.
 *
 * Propósito: impedir que una copia construida en la interfaz conserve las
 * capacidades que el backend calculó para un estado anterior (F6).
 * Contexto: desde F6 las capacidades mandan sobre el rol en farmTabs y
 * farmLifecycle. Si se degrada el rol o se cambia is_active localmente sin
 * releer la finca, las capacidades antiguas deben anularse o invalidarse.
 * Nunca se modifica el objeto recibido del servidor.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm, FarmCapabilities } from "../types/index.ts";

/** Ninguna capacidad: vista mientras no se confirma el acceso. */
export const NO_CAPABILITIES: Readonly<FarmCapabilities> = Object.freeze({
  can_edit_farm: false,
  can_deactivate_farm: false,
  can_reactivate_farm: false,
  can_view_history: false,
  can_manage_members: false,
  can_manage_invitations: false,
  can_read_inventory: false,
  can_write_inventory: false,
});

/**
 * Vista con el acceso sin confirmar: rol de consulta y ninguna capacidad.
 * @param farm - Finca tal como la conoce la interfaz (no se modifica).
 */
export function unconfirmedAccessView(farm: Farm): Farm {
  return { ...farm, role: "consulta", capabilities: { ...NO_CAPABILITIES } };
}

/**
 * Copia con cambios locales y sin capacidades: así se aplica el respaldo por
 * rol, coherente con el estado local conocido.
 * @param farm - Finca anterior (no se modifica).
 * @param changes - Campos que cambiaron localmente (p. ej. is_active).
 */
export function withLocalChanges(farm: Farm, changes: Partial<Farm>): Farm {
  const { capabilities: _stale, ...rest } = { ...farm, ...changes };
  void _stale;
  return rest;
}

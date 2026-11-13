/**
 * Acceso de escritura al inventario de una finca.
 *
 * Propósito: decidir si se muestran "Nuevo insumo" y "Registrar movimiento".
 * Contexto: usa `capabilities.can_write_inventory` calculada por el backend
 * (F6). Si falta, el respaldo es la misma regla de roles que aplica
 * apps.inventario (administrador u operador). El backend sigue siendo la
 * autoridad y responde 403 a lo no autorizado.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../auth/types/index.ts";
import type { Farm } from "../../farms/types/index.ts";

export type EmptyInventoryState = { title: string; hint: string };

/**
 * Mensaje cuando la cuenta no tiene fincas en las que operar inventario.
 * Solo invita a crear una finca si el backend confirma `can_create_farms`.
 * @param account - Capacidad global de la cuenta (puede faltar en backends previos).
 */
export function emptyInventoryState(
  account?: Pick<Account, "can_create_farms" | "can_create_first_farm">,
): EmptyInventoryState {
  if (account?.can_create_farms === true || account?.can_create_first_farm === true) {
    return {
      title: "Primero crea una finca",
      hint: "El inventario vive dentro de una finca. Créala desde la sección Fincas.",
    };
  }
  if (account?.can_create_farms === false) {
    return {
      title: "Aún no perteneces a ninguna finca",
      hint: "Pide a un administrador que te invite a una finca para ver su inventario.",
    };
  }
  return {
    title: "Aún no tienes fincas disponibles",
    hint: "El inventario vive dentro de una finca: crea una, si tu cuenta lo permite, o pide una invitación.",
  };
}

const WRITE_ROLES: ReadonlySet<Farm["role"]> = new Set(["administrador", "operador"]);

/** @returns true si la cuenta puede escribir en el inventario de la finca. */
export function canWriteInventory(
  farm: Pick<Farm, "role" | "is_active" | "capabilities"> | null | undefined,
): boolean {
  if (!farm) return false;
  if (farm.capabilities) return farm.capabilities.can_write_inventory;
  return farm.is_active && WRITE_ROLES.has(farm.role);
}

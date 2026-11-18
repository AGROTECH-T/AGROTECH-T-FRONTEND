/**
 * Secciones del detalle de finca.
 *
 * Propósito: decidir qué pestañas se muestran según el rol y el estado.
 * Contexto: la barra visual es la misma del listado (farm-roles); cada
 * pestaña muestra solo su contenido. Ocultar una sección es comodidad de
 * interfaz: el backend sigue siendo la autoridad.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm } from "../types/index.ts";

export type FarmTabId =
  | "inventarios"
  | "galpones"
  | "integrantes"
  | "invitaciones"
  | "historial"
  | "configuracion";

export type FarmTab = {
  id: FarmTabId;
  label: string;
};

/** Orden fijo de las pestañas del detalle. */
export const FARM_TABS: readonly FarmTab[] = [
  { id: "inventarios", label: "Inventarios" },
  { id: "galpones", label: "Galpones" },
  { id: "integrantes", label: "Integrantes" },
  { id: "invitaciones", label: "Invitaciones" },
  { id: "historial", label: "Historial" },
];

/** Pestaña de ajustes: editar, desactivar, reactivar o abandonar la finca. */
export const SETTINGS_TAB: FarmTab = { id: "configuracion", label: "Configuración" };

/**
 * Pestañas visibles según el rol propio y el estado de la finca.
 *
 * - Inventarios y Galpones: cualquier integrante (acceso directo a módulos).
 * - Integrantes e Invitaciones: administrador en finca activa.
 * - Historial: administrador, con la finca activa o desactivada.
 * @param farm - Finca con el rol de la cuenta.
 * @returns Pestañas en su orden fijo.
 */
export function visibleTabs(
  farm: Pick<Farm, "role" | "is_active" | "capabilities">,
): FarmTab[] {
  const caps = farm.capabilities;
  if (caps) {
    return FARM_TABS.filter((tab) => {
      if (tab.id === "inventarios" || tab.id === "galpones") return true;
      if (tab.id === "integrantes") return caps.can_manage_members;
      if (tab.id === "invitaciones") return caps.can_manage_invitations;
      return caps.can_view_history;
    });
  }
  const isAdmin = farm.role === "administrador";
  return FARM_TABS.filter((tab) => {
    if (tab.id === "inventarios" || tab.id === "galpones") return true;
    if (!isAdmin) return false;
    if (tab.id === "historial") return true;
    return farm.is_active;
  });
}

/**
 * Pestañas del detalle: las de `visibleTabs` y, al final, Configuración
 * cuando la cuenta tiene al menos una acción sobre la finca.
 * @param farm - Finca con el rol de la cuenta.
 * @param hasSettings - true si hay alguna acción de configuración disponible.
 * @returns Pestañas en su orden fijo.
 */
export function detailTabs(
  farm: Pick<Farm, "role" | "is_active" | "capabilities">,
  hasSettings: boolean,
): FarmTab[] {
  const tabs = visibleTabs(farm);
  return hasSettings ? [...tabs, SETTINGS_TAB] : tabs;
}

/**
 * Devuelve la sección pedida si está visible; si no, la primera.
 * @param tabs - Secciones visibles.
 * @param requested - Sección deseada.
 */
export function resolveTab(tabs: readonly FarmTab[], requested: FarmTabId): FarmTabId {
  if (tabs.some((tab) => tab.id === requested)) return requested;
  return tabs[0]?.id ?? "inventarios";
}

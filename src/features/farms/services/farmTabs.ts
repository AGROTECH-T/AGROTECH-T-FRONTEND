/**
 * Pestañas del detalle de finca.
 *
 * Propósito: decidir qué pestañas se muestran y cómo se navega entre ellas.
 * Contexto: la visibilidad solo usa datos que ya devuelve la API (rol propio
 * y estado de la finca). Ocultar una pestaña es comodidad de interfaz: el
 * backend sigue siendo la autoridad y responde 403/404 si no corresponde.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm } from "../types/index.ts";

export type FarmTabId = "resumen" | "integrantes" | "invitaciones" | "historial" | "configuracion";

export type FarmTab = {
  id: FarmTabId;
  label: string;
};

/** Orden fijo de las pestañas. */
export const FARM_TABS: readonly FarmTab[] = [
  { id: "resumen", label: "Resumen" },
  { id: "integrantes", label: "Integrantes" },
  { id: "invitaciones", label: "Invitaciones" },
  { id: "historial", label: "Historial" },
];

/**
 * Pestañas visibles según el rol propio y el estado de la finca.
 *
 * - Resumen: cualquier integrante.
 * - Integrantes e Invitaciones: administrador en finca activa (el backend
 *   exige finca activa y rol administrador en ambos listados).
 * - Historial: administrador, con la finca activa o desactivada.
 * @param farm - Finca con el rol de la cuenta.
 * @returns Pestañas en su orden fijo.
 */
export function visibleTabs(
  farm: Pick<Farm, "role" | "is_active" | "capabilities">,
): FarmTab[] {
  const caps = farm.capabilities;
  if (caps) {
    // F6: capacidades calculadas por el backend.
    return FARM_TABS.filter((tab) => {
      if (tab.id === "resumen") return true;
      if (tab.id === "integrantes") return caps.can_manage_members;
      if (tab.id === "invitaciones") return caps.can_manage_invitations;
      return caps.can_view_history;
    });
  }
  const isAdmin = farm.role === "administrador";
  return FARM_TABS.filter((tab) => {
    if (tab.id === "resumen") return true;
    if (!isAdmin) return false;
    if (tab.id === "historial") return true;
    return farm.is_active;
  });
}

/** Pestaña de ajustes: editar, desactivar, reactivar o abandonar la finca. */
export const SETTINGS_TAB: FarmTab = { id: "configuracion", label: "Configuración" };

/**
 * Pestañas del detalle: las de `visibleTabs` y, al final, Configuración
 * cuando la cuenta tiene al menos una acción sobre la finca. El Resumen es
 * solo de lectura; los cambios viven en Configuración.
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
 * Devuelve la pestaña pedida si está visible; si no, la primera.
 * @param tabs - Pestañas visibles.
 * @param requested - Pestaña deseada.
 */
export function resolveTab(tabs: readonly FarmTab[], requested: FarmTabId): FarmTabId {
  if (tabs.some((tab) => tab.id === requested)) return requested;
  return tabs[0]?.id ?? "resumen";
}

/**
 * Calcula la pestaña destino para la navegación por teclado (patrón WAI-ARIA).
 * @param tabs - Pestañas visibles.
 * @param current - Pestaña activa.
 * @param key - Tecla pulsada.
 * @returns Pestaña destino, o null si la tecla no navega.
 */
export function tabForKey(
  tabs: readonly FarmTab[],
  current: FarmTabId,
  key: string,
): FarmTabId | null {
  if (tabs.length === 0) return null;
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === current),
  );
  switch (key) {
    case "ArrowRight":
      return tabs[(index + 1) % tabs.length].id;
    case "ArrowLeft":
      return tabs[(index - 1 + tabs.length) % tabs.length].id;
    case "Home":
      return tabs[0].id;
    case "End":
      return tabs[tabs.length - 1].id;
    default:
      return null;
  }
}

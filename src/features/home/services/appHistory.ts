/**
 * Historial del shell autenticado.
 *
 * Propósito: que Atrás del navegador cambie de sección sin sacar de la sesión.
 * Contexto: la SPA guarda el token en sessionStorage (recargar sí restaura),
 * pero sin pushState el navegador vuelve a una entrada vieja (login en caché).
 * @author Cristian Deysdayr Jimenez
 */

import type { AppSection } from "../../../components/layout/index.ts";

export type AppHistoryState = {
  agrotechApp: true;
  section: AppSection;
  view?: string;
};

export type HistoryWriter = Pick<History, "pushState" | "replaceState">;

/**
 * Comprueba si el estado del historial es de la app autenticada.
 * @param state - history.state del evento o de la entrada actual.
 * @returns true si es una entrada del shell.
 */
export function isAppHistoryState(state: unknown): state is AppHistoryState {
  if (!state || typeof state !== "object") return false;
  const value = state as { agrotechApp?: unknown; section?: unknown };
  return value.agrotechApp === true && typeof value.section === "string";
}

/**
 * Arma el estado que se guarda en el historial.
 * @param section - Sección del shell.
 * @param view - Vista interna opcional.
 * @returns Estado serializable.
 */
export function appHistoryState(section: AppSection, view?: string): AppHistoryState {
  return view ? { agrotechApp: true, section, view } : { agrotechApp: true, section };
}

/**
 * Sustituye la entrada actual (login → app) sin crear otra.
 * @param section - Sección visible.
 * @param view - Vista interna opcional.
 * @param history - Historial del navegador.
 */
export function replaceAppHistory(
  section: AppSection,
  view?: string,
  history: HistoryWriter | null = globalThis.history ?? null,
): void {
  try {
    history?.replaceState(appHistoryState(section, view), "", "/");
  } catch {
    // Si el historial no se puede tocar, la sesión sigue igual.
  }
}

/**
 * Empuja una sección nueva para que Atrás pueda volver a la anterior.
 * @param section - Sección destino.
 * @param view - Vista interna opcional.
 * @param history - Historial del navegador.
 */
export function pushAppHistory(
  section: AppSection,
  view?: string,
  history: HistoryWriter | null = globalThis.history ?? null,
): void {
  try {
    history?.pushState(appHistoryState(section, view), "", "/");
  } catch {
    // Misma política que replace: no tumbar la UI.
  }
}

/**
 * Escucha Atrás/Adelante del navegador.
 * @param onPop - Recibe el estado de la app o null si la entrada no es nuestra.
 * @param target - Ventana a escuchar.
 * @returns Función para dejar de escuchar.
 */
export function subscribeAppHistory(
  onPop: (state: AppHistoryState | null) => void,
  target: Pick<Window, "addEventListener" | "removeEventListener"> | null = globalThis.window ?? null,
): () => void {
  if (!target) return () => undefined;
  const handle = (event: Event) => {
    const state = (event as PopStateEvent).state;
    onPop(isAppHistoryState(state) ? state : null);
  };
  target.addEventListener("popstate", handle);
  return () => target.removeEventListener("popstate", handle);
}

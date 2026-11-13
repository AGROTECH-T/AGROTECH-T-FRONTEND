/**
 * Índice de búsqueda del sistema.
 *
 * Propósito: encontrar cualquier módulo o acceso desde la barra superior.
 * Contexto: hoy cubre secciones y paneles; crece cuando aparecen más módulos.
 * @author Cristian Deysdayr Jimenez
 */

import { NAV_ITEMS, type AppSection } from "./navTypes.ts";

export type SearchAction = "profile" | "notifications";

type BaseEntry = {
  id: string;
  label: string;
  hint: string;
};

export type SearchEntry =
  | (BaseEntry & { kind: "section"; section: AppSection })
  | (BaseEntry & { kind: "action"; action: SearchAction });

/** Todo lo que hoy se puede encontrar dentro de AGROTECH-T. */
export const SEARCH_ENTRIES: readonly SearchEntry[] = [
  ...NAV_ITEMS.map(
    (item): SearchEntry => ({
      kind: "section",
      id: `section-${item.id}`,
      label: item.label,
      hint: "Módulo",
      section: item.id,
    }),
  ),
  {
    kind: "action",
    id: "action-notifications",
    label: "Notificaciones",
    hint: "Avisos",
    action: "notifications",
  },
  {
    kind: "section",
    id: "section-perfil",
    label: "Mi perfil",
    hint: "Cuenta",
    section: "perfil",
  },
];

/**
 * Filtra el catálogo por lo que escribe la persona y por sus módulos.
 * @param query - Texto del buscador.
 * @param modulos - Módulos que la cuenta puede abrir.
 * @returns Coincidencias de secciones y accesos.
 */
export function searchEntries(query: string, modulos: readonly string[] = []): SearchEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const allowed = new Set(modulos);
  return SEARCH_ENTRIES.filter((entry) => {
    if (entry.kind === "section" && entry.section !== "perfil" && !allowed.has(entry.section)) {
      return false;
    }
    return entry.label.toLowerCase().includes(needle) || entry.hint.toLowerCase().includes(needle);
  });
}

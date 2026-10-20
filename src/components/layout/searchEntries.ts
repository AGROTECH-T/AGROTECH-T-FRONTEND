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
 * Filtra el catálogo por lo que escribe la persona.
 * @param query - Texto del buscador.
 * @returns Coincidencias de secciones y accesos.
 */
export function searchEntries(query: string): SearchEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return SEARCH_ENTRIES.filter(
    (entry) =>
      entry.label.toLowerCase().includes(needle) ||
      entry.hint.toLowerCase().includes(needle),
  );
}

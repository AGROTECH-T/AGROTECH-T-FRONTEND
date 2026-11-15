/**
 * Búsqueda local del catálogo.
 *
 * Propósito: filtrar medidas, unidades y categorías por texto.
 * Contexto: cada pestaña busca solo en sus propios campos.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * Indica si algún campo contiene el texto buscado.
 * @param query - Texto escrito por la persona.
 * @param fields - Campos de esa fila.
 * @returns true si coincide o si no hay búsqueda.
 */
export function matchesCatalogQuery(query: string, fields: readonly (string | null | undefined)[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field ?? "").toLowerCase().includes(needle));
}

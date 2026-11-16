/**
 * Búsqueda local del catálogo.
 *
 * Propósito: filtrar categorías, unidades o medidas con el texto escrito.
 * Contexto: cada pantalla busca solo en su lista y en lo ligado a ella.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * ¿El texto entra en alguno de los datos de esa fila?
 * @param query - Lo que escribió la persona.
 * @param parts - Nombre, símbolo u otros datos de esa fila.
 * @returns true si no hay búsqueda o si coincide.
 */
export function matchesCatalogQuery(query: string, parts: Array<string | null | undefined>): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(term));
}

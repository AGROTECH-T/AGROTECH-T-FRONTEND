/**
 * Paginación de listas de inventario.
 *
 * Propósito: 25 filas por página en productos, catálogo, historial y reportes.
 * @author Cristian Deysdayr Jimenez
 */

export const INV_PAGE_SIZE = 25;

/**
 * Cuántas páginas hay para un total.
 * @param count - Filas totales.
 * @param size - Tamaño de página.
 * @returns Al menos 1.
 */
export function pageCount(count: number, size = INV_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / size));
}

/**
 * Recorta una lista a la página pedida.
 * @param items - Lista completa.
 * @param page - Página 1-based.
 * @param size - Tamaño de página.
 * @returns Recorte de esa página.
 */
export function slicePage<T>(items: T[], page: number, size = INV_PAGE_SIZE): T[] {
  const start = (Math.max(1, page) - 1) * size;
  return items.slice(start, start + size);
}

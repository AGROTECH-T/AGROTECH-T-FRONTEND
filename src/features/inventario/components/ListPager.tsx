/**
 * Controles Anterior / Siguiente de inventario.
 *
 * Propósito: la misma paginación en listas y tablas.
 * @author Cristian Deysdayr Jimenez
 */

import { INV_PAGE_SIZE, pageCount } from "../services/paging.ts";

type Props = {
  page: number;
  count: number;
  onPage: (page: number) => void;
  one: string;
  many: string;
};

/**
 * Barra de páginas. Se oculta si no hay filas.
 * @param props - Página, total, cambio y nombre de las filas.
 * @returns Navegación o nada.
 */
export function ListPager({ page, count, onPage, one, many }: Readonly<Props>) {
  if (count <= 0) return null;
  const pages = pageCount(count);
  const noun = count === 1 ? one : many;
  return (
    <nav className="inv-pager" aria-label={`Páginas de ${many}`}>
      <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {pages} · {count} {noun}
      </span>
      <button
        type="button"
        className="btn-secondary"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}

export { INV_PAGE_SIZE };

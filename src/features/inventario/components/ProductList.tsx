/**
 * Listado de productos de inventario.
 *
 * Propósito: mostrar nombre, código de barras, stock y estado.
 * @author Cristian Deysdayr Jimenez
 */

import { stockStatus, stockStatusLabel } from "../services/stockStatus.ts";
import type { Product } from "../types/index.ts";

type Props = {
  products: Product[];
  onSelect: (product: Product) => void;
};

/**
 * Filas del inventario.
 * @param props - Productos y selección.
 * @returns Lista.
 */
export function ProductList({ products, onSelect }: Readonly<Props>) {
  return (
    <ul className="inv-list">
      {products.map((product) => {
        const status = stockStatus(product.quantity, product.min_stock);
        return (
          <li key={product.id}>
            <button type="button" className="inv-row" onClick={() => onSelect(product)}>
              <span className="inv-row__main">
                <span className="inv-row__name">{product.name}</span>
                <span className="inv-row__code">{product.barcode}</span>
              </span>
              <span className="inv-row__stock">
                {product.quantity} {product.unit_label}
              </span>
              <span className={`inv-chip is-${status}`}>{stockStatusLabel(status)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Tabla de insumos de la finca.
 *
 * Propósito: ver stock y lanzar cada acción con un botón propio.
 * @author Cristian Deysdayr Jimenez
 */

import type { ReactNode } from "react";
import ajusteIcon from "../../../assets/icons/ajuste.png";
import devolverIcon from "../../../assets/icons/devolver.png";
import prestarIcon from "../../../assets/icons/prestar.png";
import type { FarmRole } from "../../farms/types/index.ts";
import { displayQuantity } from "../services/equivalence.ts";
import { stockStatus, stockStatusLabel } from "../services/stockStatus.ts";
import type { MovementKind, Product } from "../types/index.ts";

type Order = "name" | "quantity" | "last_movement";

/**
 * Nombre de la unidad con lo que trae, como Bulto (120 kg).
 * @param product - Insumo de la fila.
 * @returns Texto de la columna Unidad.
 */
function unitName(product: Product): string {
  const factor = Number(product.unit_factor);
  if (!Number.isFinite(factor) || factor === 1) return product.unit_label;
  const content = `${String(factor)} ${product.base_symbol}`;
  if (product.unit_label.toLowerCase().includes(content.toLowerCase())) return product.unit_label;
  return `${product.unit_label} (${content})`;
}

type Props = {
  products: Product[];
  role: FarmRole;
  order: Order;
  onSort: (order: Order) => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onMove: (product: Product, kind: MovementKind) => void;
  onLend: (product: Product) => void;
  onReturn: (product: Product) => void;
  desk?: "entrada" | "salida" | null;
  amountOf?: (product: Product) => string;
  amountError?: (product: Product) => string;
  onAmount?: (product: Product, value: string) => void;
};

/**
 * Tabla con columnas de producto, stock y acciones visibles.
 * @param props - Filas, rol y acciones de la fila.
 * @returns Tabla.
 */
export function ProductList({
  products,
  role,
  order,
  onSort,
  onView,
  onEdit,
  onMove,
  onLend,
  onReturn,
  desk = null,
  amountOf,
  amountError,
  onAmount,
}: Readonly<Props>) {
  const canWrite = role === "administrador" || role === "operador";
  const isAdmin = role === "administrador";

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th scope="col">
              <button type="button" className="inv-sort" onClick={() => onSort("name")}>
                Producto{order === "name" ? " · A-Z" : ""}
              </button>
            </th>
            <th scope="col">Categoría</th>
            <th scope="col">Unidad</th>
            <th scope="col">
              <button type="button" className="inv-sort" onClick={() => onSort("quantity")}>
                Stock actual{order === "quantity" ? " · menor" : ""}
              </button>
            </th>
            <th scope="col">Stock mínimo</th>
            <th scope="col">Prestado</th>
            <th scope="col">Estado</th>
            {desk ? <th scope="col">Cantidad</th> : <th scope="col">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const status = product.is_active
              ? stockStatus(product.quantity, product.min_stock)
              : "inactivo";
            const qty = displayQuantity(product.quantity, product.unit_nature);
            const minimum = displayQuantity(product.min_stock, product.unit_nature);
            const lent = displayQuantity(product.lent_quantity || "0", product.unit_nature);
            const canMove = canWrite && product.is_active;
            return (
              <tr key={product.id}>
                <th scope="row">
                  <span className="inv-product">{product.name}</span>
                  <span className="inv-product__meta">{product.barcode || "Sin código"}</span>
                </th>
                <td>{product.category_label}</td>
                <td>
                  <span className="inv-unit">{unitName(product)}</span>
                </td>
                <td>
                  <span className="inv-qty">{qty}</span>
                </td>
                <td>{minimum}</td>
                <td>
                  <span className="inv-qty">{lent}</span>
                </td>
                <td>
                  <span className={`inv-chip is-${status}`}>{stockStatusLabel(status)}</span>
                </td>
                <td>
                  {desk && onAmount && amountOf ? (
                    <div className={amountError?.(product) ? "inv-amount-cell is-miss" : "inv-amount-cell"}>
                      <input
                        className="inv-amount"
                        inputMode="decimal"
                        aria-label={`Cantidad de ${product.name}`}
                        value={amountOf(product)}
                        disabled={!product.is_active}
                        placeholder={product.is_active ? "0" : "Inactivo"}
                        onChange={(event) => onAmount(product, event.target.value)}
                      />
                      {amountError?.(product) ? <span className="field-miss">{amountError(product)}</span> : null}
                    </div>
                  ) : (
                  <div className="inv-actions">
                    {isAdmin ? (
                      <ActionButton label="Editar producto" onClick={() => onEdit(product)}>
                        <PencilIcon />
                      </ActionButton>
                    ) : null}
                    <ActionButton label="Ver producto" onClick={() => onView(product)}>
                      <EyeIcon />
                    </ActionButton>
                    {canMove && isAdmin ? (
                      <ActionButton label="Ajuste" tone="ajuste" onClick={() => onMove(product, "ajuste")}>
                        <ActionIcon src={ajusteIcon} />
                      </ActionButton>
                    ) : null}
                    {canMove ? (
                      <ActionButton label="Prestar" onClick={() => onLend(product)}>
                        <ActionIcon src={prestarIcon} />
                      </ActionButton>
                    ) : null}
                    {canMove ? (
                      <ActionButton label="Devolver" onClick={() => onReturn(product)}>
                        <ActionIcon src={devolverIcon} />
                      </ActionButton>
                    ) : null}
                  </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Botón de una sola acción, con el nombre al pasar el cursor.
 */
function ActionButton({
  label,
  tone,
  onClick,
  children,
}: Readonly<{
  label: string;
  tone?: "ajuste";
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      className={tone ? `inv-act is-${tone}` : "inv-act"}
      data-label={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}

/**
 * Ícono de acción con la forma del archivo y el color del botón.
 * @param props - Ruta del ícono.
 * @returns Máscara que toma el color actual.
 */
function ActionIcon({ src }: Readonly<{ src: string }>) {
  const mask = `url(${src})`;
  return (
    <span
      className="inv-act__icon"
      aria-hidden="true"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}

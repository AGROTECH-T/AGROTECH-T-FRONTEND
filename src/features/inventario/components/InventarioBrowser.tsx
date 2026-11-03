/**
 * Listado operativo del inventario de una finca.
 *
 * Propósito: buscar, crear y abrir productos.
 * Contexto: la finca ya está elegida.
 * @author Cristian Deysdayr Jimenez
 */

import { useMemo, useState } from "react";
import type { Product } from "../types/index.ts";
import { ProductCreateForm } from "./ProductCreateForm.tsx";
import { ProductList } from "./ProductList.tsx";

type Props = {
  farmId: number;
  products: Product[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onSelect: (product: Product) => void;
  onCreated: (product: Product) => void;
};

/**
 * Toolbar, alta y listado de productos.
 * @param props - Estado del inventario de la finca.
 * @returns Bloque de listado.
 */
export function InventarioBrowser({
  farmId,
  products,
  loading,
  error,
  onReload,
  onSelect,
  onCreated,
}: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.barcode.toLowerCase().includes(needle),
    );
  }, [products, query]);

  return (
    <>
      <div className="inventario-toolbar">
        <label className="inventario-search">
          <span className="visually-hidden">Buscar insumo</span>
          <input
            type="search"
            placeholder="Buscar por nombre o código..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          + Nuevo insumo
        </button>
      </div>

      {creating ? (
        <ProductCreateForm
          farmId={farmId}
          onCancel={() => setCreating(false)}
          onCreated={(product) => {
            setCreating(false);
            onCreated(product);
          }}
        />
      ) : null}

      {loading ? <p className="farm-state">Cargando inventario...</p> : null}
      {!loading && error ? (
        <div className="farm-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={onReload}>
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !error && filtered.length === 0 ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Aún no hay insumos</p>
          <p className="inventario-empty__hint">
            Elige unidad y categoría del sistema; el código de barras es obligatorio.
          </p>
        </div>
      ) : null}
      {!loading && !error && filtered.length > 0 ? (
        <ProductList products={filtered} onSelect={onSelect} />
      ) : null}
    </>
  );
}

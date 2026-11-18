/**
 * Estadísticas de inventario.
 *
 * Propósito: mostrar el estado del stock con filtros y cuatro cifras:
 * registrados, disponibles, existencia baja y agotados.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import { listAllProducts } from "../services/inventoryApi.ts";
import type { Product } from "../types/index.ts";
import { CategoryPie, type Slice } from "./reportCharts.tsx";
import { ReportShell } from "./ReportShell.tsx";
import { useCategoryOptions } from "./useReportOptions.ts";
import { defaultRange } from "../services/reportRange.ts";

/** Colores distintos para el pastel de categorías. */
const CATEGORY_COLORS = ["#1f7a45", "#2f80ed", "#f2c94c", "#eb5757", "#9b51e0", "#56ccf2", "#f2994a", "#27ae60"];

type Props = {
  farmId: number;
  farmName: string;
  onBack: () => void;
  onLowStock: () => void;
};

type StockSummary = {
  registered: number;
  available: number;
  low: number;
  out: number;
};

/**
 * Resumen de existencias con filtros de rango, categoría y producto.
 * @param props - Finca, regreso y acceso a stock bajo.
 * @returns Pantalla de estadísticas.
 */
export function ConsumptionReport({ farmId, onBack, onLowStock }: Readonly<Props>) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const categories = useCategoryOptions();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void listAllProducts(farmId)
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((cause) => {
        if (!active) return;
        setProducts([]);
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farmId]);

  const summary = useMemo(() => stockSummary(products, category, product), [products, category, product]);
  const categorySlices = useMemo(
    () => categoryShares(products, category, product),
    [products, category, product],
  );

  return (
    <ReportShell
      title="Estadísticas de inventario"
      lead="Estado general de las existencias."
      onBack={onBack}
      loading={loading}
      error={error}
      empty={!loading && !error && products.length === 0}
      emptyText="No hay productos en esta finca."
      filters={
        <>
          <label className="inv-form__field">
            <span>Desde</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="inv-form__field">
            <span>Hasta</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="inv-form__field">
            <span>Categoría</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inv-form__field">
            <span>Producto</span>
            <select value={product} onChange={(event) => setProduct(event.target.value)}>
              <option value="">Todos</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </>
      }
    >
      <section className="stock-summary" aria-labelledby="stock-summary-title">
        <header className="stock-summary__head">
          <h3 id="stock-summary-title">Resumen del inventario</h3>
          <p>Estado general de las existencias</p>
        </header>
        <div className="stock-summary__grid">
          <article className="stock-summary__card">
            <span className="stock-summary__icon is-box" aria-hidden="true">
              <SummaryIcon kind="box" />
            </span>
            <div>
              <strong>{summary.registered}</strong>
              <span>Productos registrados</span>
            </div>
          </article>
          <article className="stock-summary__card">
            <span className="stock-summary__icon is-ok" aria-hidden="true">
              <SummaryIcon kind="ok" />
            </span>
            <div>
              <strong>{summary.available}</strong>
              <span>Disponibles</span>
            </div>
          </article>
          <button type="button" className="stock-summary__card is-button" onClick={onLowStock}>
            <span className="stock-summary__icon is-warn" aria-hidden="true">
              <SummaryIcon kind="warn" />
            </span>
            <div>
              <strong>{summary.low}</strong>
              <span>Existencias bajas</span>
            </div>
          </button>
          <article className="stock-summary__card">
            <span className="stock-summary__icon is-out" aria-hidden="true">
              <SummaryIcon kind="out" />
            </span>
            <div>
              <strong>{summary.out}</strong>
              <span>Agotados</span>
            </div>
          </article>
        </div>
      </section>

      <section className="stats__card stock-categories" aria-labelledby="stock-categories-title">
        <header className="dash__head">
          <h3 id="stock-categories-title">Categorías más utilizadas</h3>
        </header>
        <CategoryPie slices={categorySlices} emptyText="No hay categorías con esos filtros." />
      </section>
    </ReportShell>
  );
}

/**
 * Cuenta productos según filtros y reglas de stock.
 * @param products - Catálogo de la finca.
 * @param category - Código de categoría o vacío.
 * @param productId - Id del producto o vacío.
 * @returns Totales del resumen.
 */
function stockSummary(products: Product[], category: string, productId: string): StockSummary {
  const visible = filterProducts(products, category, productId);
  const out = visible.filter((item) => Number(item.quantity) <= 0);
  const low = visible.filter((item) => Number(item.quantity) > 0 && item.is_low_stock);
  const available = visible.filter((item) => Number(item.quantity) > 1);
  return {
    registered: visible.length,
    available: available.length,
    low: low.length,
    out: out.length,
  };
}

/**
 * Parte de productos por categoría, con colores distintos.
 * @param products - Catálogo de la finca.
 * @param category - Código de categoría o vacío.
 * @param productId - Id del producto o vacío.
 * @returns Hasta ocho porciones para el pastel.
 */
function categoryShares(products: Product[], category: string, productId: string): Slice[] {
  const totals = new Map<string, number>();
  for (const item of filterProducts(products, category, productId)) {
    const label = item.category_label || item.category;
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, value], index) => ({
      label,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
}

/**
 * Aplica los filtros de categoría y producto.
 * @param products - Catálogo completo.
 * @param category - Código de categoría o vacío.
 * @param productId - Id del producto o vacío.
 * @returns Productos visibles.
 */
function filterProducts(products: Product[], category: string, productId: string): Product[] {
  return products.filter((item) => {
    if (category && item.category !== category) return false;
    if (productId && String(item.id) !== productId) return false;
    return true;
  });
}

type IconKind = "box" | "ok" | "warn" | "out";

/**
 * Ícono del resumen.
 * @param props - Variante visual.
 * @returns SVG decorativo.
 */
function SummaryIcon({ kind }: Readonly<{ kind: IconKind }>) {
  if (kind === "box") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
        <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
      </svg>
    );
  }
  if (kind === "ok") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8 12.2 2.6 2.6L16.2 9" />
      </svg>
    );
  }
  if (kind === "warn") {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 10v5" />
        <circle cx="12" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

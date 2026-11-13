/**
 * Estadísticas de consumo.
 *
 * Propósito: mostrar el consumo del rango como tablero: cifras, barras,
 * comparación con el periodo anterior y tendencia de seis meses.
 * Contexto: el consumo son las salidas y se agrupa por símbolo base.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { downloadConsumptionReport, getConsumptionReport } from "../services/inventoryApi.ts";
import { displayQuantity } from "../services/equivalence.ts";
import { formatDate, variationText } from "../services/reportFormat.ts";
import { defaultRange } from "../services/reportRange.ts";
import type {
  ConsumptionReport as ConsumptionReportData,
  ConsumptionRow,
} from "../types/index.ts";
import {
  BarList,
  CategoryPie,
  ComparisonList,
  FlowLines,
  Sparkline,
  StockDonut,
  type BarItem,
  type CompareItem,
  type Slice,
} from "./reportCharts.tsx";
import { ReportShell, ReportStat } from "./ReportShell.tsx";
import { useCategoryOptions, useProductOptions } from "./useReportOptions.ts";

type Props = {
  farmId: number;
  farmName: string;
  onBack: () => void;
  onLowStock: () => void;
};

/**
 * Tablero de consumo con filtros, gráficas y detalle.
 * @param props - Finca y regreso.
 * @returns Reporte con descarga.
 */
export function ConsumptionReport({ farmId, farmName, onBack, onLowStock }: Readonly<Props>) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState("");
  const [data, setData] = useState<ConsumptionReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const products = useProductOptions(farmId);
  const categories = useCategoryOptions();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getConsumptionReport(farmId, { from, to, category, product })
      .then((report) => {
        if (active) setData(report);
      })
      .catch((cause) => {
        if (!active) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el reporte");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farmId, from, to, category, product]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadConsumptionReport(farmId, { from, to, category, product });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el reporte");
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const previousAvailable = data?.previous.available ?? false;
  const previousBySymbol = sumBySymbol(rows);
  const bars: BarItem[] = rows.slice(0, 8).map((row) => ({
    id: String(row.product_id),
    label: row.product,
    caption: `${row.moves} ${row.moves === 1 ? "salida" : "salidas"} · ${row.category}`,
    value: Number(row.base),
    text: `${displayQuantity(row.quantity, "continua")} ${row.unit}`,
    share: row.share,
  }));
  const comparison: CompareItem[] = rows
    .filter((row) => row.previous !== null)
    .slice(0, 8)
    .map((row) => ({
      id: String(row.product_id),
      label: row.product,
      now: Number(row.base),
      before: Number(row.previous ?? 0),
      nowText: `${displayQuantity(row.base, "continua")} ${row.base_symbol}`,
      beforeText: `${displayQuantity(row.previous ?? "0", "continua")} ${row.base_symbol}`,
      variation: row.variation,
    }));
  const moves = rows.reduce((total, row) => total + row.moves, 0);
  const flow = data?.flow ?? [];
  const entradas = flow.reduce((total, day) => total + day.entradas, 0);
  const salidas = flow.reduce((total, day) => total + day.salidas, 0);
  const visible = products.filter((item) => {
    if (category && item.category !== category) return false;
    if (product && String(item.id) !== product) return false;
    return true;
  });
  const outOfStock = visible.filter((item) => Number(item.quantity) <= 0);
  const lowStock = visible.filter((item) => Number(item.quantity) > 0 && item.is_low_stock);
  const healthy = visible.length - outOfStock.length - lowStock.length;
  const stockSlices: Slice[] = [
    { label: "Stock adecuado", value: healthy, color: "#1f7a45" },
    { label: "Stock bajo", value: lowStock.length, color: "#8fd4a8" },
    { label: "Sin stock", value: outOfStock.length, color: "#e07a7a" },
  ];
  const categorySlices = categoryShares(rows);
  const scarce = [...outOfStock, ...lowStock].slice(0, 4);

  return (
    <ReportShell
      title="Estadísticas de inventario"
      lead="Información clave de tus insumos y movimientos."
      onBack={onBack}
      downloading={downloading}
      onDownload={() => void download()}
      loading={loading}
      error={error}
      empty={visible.length === 0 && rows.length === 0}
      emptyText="No hay productos ni movimientos con esos filtros."
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
      summary={
        <>
          {(data?.by_symbol ?? []).map((item) => {
            const before = previousBySymbol.get(item.symbol);
            const change = previousAvailable ? variation(item.base, before) : null;
            return (
              <ReportStat
                key={item.symbol}
                label={`Consumo (${item.symbol})`}
                value={`${displayQuantity(item.base, "continua")} ${item.symbol}`}
                hint={previousHint(previousAvailable, change, before, item.symbol)}
                tone={change !== null && change > 0 ? "warn" : "ok"}
              />
            );
          })}
          <ReportStat
            label="Con consumo"
            value={String(data?.count ?? 0)}
            hint={`${moves} salidas`}
          />
          <ReportStat
            label="Periodo anterior"
            value={
              previousAvailable
                ? `${formatDate(data?.previous.from ?? null)} a ${formatDate(data?.previous.to ?? null)}`
                : "Elige fechas"
            }
            hint={previousAvailable ? "Misma duración, justo antes" : "Sin rango no hay comparación"}
          />
        </>
      }
    >
      <div className="stats">
        <section className="stats__kpis">
          <article className="stats__kpi">
            <span>Total de productos</span>
            <strong>{visible.length}</strong>
            <small>Con los filtros de arriba</small>
          </article>
          <article className="stats__kpi">
            <span>Entradas del periodo</span>
            <strong>{entradas}</strong>
            <small>Movimientos de entrada</small>
          </article>
          <article className="stats__kpi">
            <span>Salidas del periodo</span>
            <strong>{salidas}</strong>
            <small>{previousAvailable ? "Comparables con el periodo anterior" : "Movimientos de salida"}</small>
          </article>
          <article className="stats__kpi is-warn">
            <span>Stock bajo</span>
            <strong>{lowStock.length + outOfStock.length}</strong>
            <button type="button" onClick={onLowStock}>Ver detalles</button>
          </article>
        </section>

        <section className="stats__card">
          <header className="dash__head">
            <h3>Resumen general</h3>
          </header>
          <StockDonut slices={stockSlices} />
        </section>

        <section className="stats__card">
          <header className="dash__head">
            <h3>Movimientos en el tiempo</h3>
            <span className="stats__key">
              <i className="is-in" /> Entradas
              <i className="is-out" /> Salidas
            </span>
          </header>
          <FlowLines points={flow} />
        </section>

        <section className="stats__card">
          <header className="dash__head">
            <h3>Productos con stock bajo</h3>
            <button type="button" className="stats__link" onClick={onLowStock}>Ver todos</button>
          </header>
          {scarce.length === 0 ? (
            <p className="chart-empty">Ningún producto está bajo el mínimo.</p>
          ) : (
            <ul className="stats__lows">
              {scarce.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {Number(item.quantity) <= 0
                        ? "Sin stock"
                        : `Stock mínimo: ${displayQuantity(item.min_stock, item.unit_nature)}`}
                    </small>
                  </div>
                  <em>
                    {displayQuantity(item.quantity, item.unit_nature)} {item.unit_label}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="stats__card">
          <header className="dash__head">
            <h3>Categorías más utilizadas</h3>
          </header>
          <CategoryPie slices={categorySlices} />
        </section>

        <section className="stats__card stats__farm">
          <header className="dash__head">
            <h3>Inventario por finca</h3>
          </header>
          <p className="stats__farm-name">{farmName}</p>
          <div className="stats__farm-metrics">
            <div>
              <span>Total de productos</span>
              <strong>{visible.length}</strong>
            </div>
            <div>
              <span>Salidas del periodo</span>
              <strong>{moves}</strong>
            </div>
          </div>
        </section>
      </div>

      <div className="dash">
        <section className="dash__card">
          <header className="dash__head">
            <h3>Consumo por producto</h3>
            <span>Ocho primeros</span>
          </header>
          <BarList items={bars} emptyText="No hay salidas en el rango." />
        </section>

        <section className="dash__card">
          <header className="dash__head">
            <h3>Comparación con el periodo anterior</h3>
            <span>{previousAvailable ? "Ocho primeros · misma duración" : "Sin periodo"}</span>
          </header>
          {previousAvailable ? (
            <ComparisonList items={comparison} />
          ) : (
            <p className="chart-empty">
              Elige Desde y Hasta para comparar contra el periodo anterior.
            </p>
          )}
        </section>

        <section className="dash__card dash__card--wide">
          <header className="dash__head">
            <h3>Tendencia de los últimos seis meses</h3>
            <span>Por unidad base</span>
          </header>
          <div className="dash__sparks">
            {(data?.by_symbol ?? []).map((item) => (
              <Sparkline
                key={item.symbol}
                symbol={item.symbol}
                points={(data?.trend ?? []).map((month) => ({
                  label: month.current ? `${month.label} (en curso)` : month.label,
                  current: month.current,
                  value: Number(month.items.find((entry) => entry.symbol === item.symbol)?.base ?? 0),
                }))}
              />
            ))}
          </div>
        </section>

        <section className="dash__card dash__card--wide">
          <header className="dash__head">
            <h3>Detalle por producto</h3>
            <span>{rows.length} productos con salidas</span>
          </header>
          <div className="rp__table">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Consumido</th>
                  <th>Equivalencia</th>
                  <th>Salidas</th>
                  <th>Parte</th>
                  {previousAvailable ? <th>Anterior</th> : null}
                  {previousAvailable ? <th>Variación</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.product_id}>
                    <td>{row.product}</td>
                    <td>{row.category}</td>
                    <td>{`${displayQuantity(row.quantity, "continua")} ${row.unit}`}</td>
                    <td>{`${displayQuantity(row.base, "continua")} ${row.base_symbol}`}</td>
                    <td>{row.moves}</td>
                    <td>{`${row.share}%`}</td>
                    {previousAvailable ? (
                      <td>{`${displayQuantity(row.previous ?? "0", "continua")} ${row.base_symbol}`}</td>
                    ) : null}
                    {previousAvailable ? (
                      <td className={deltaClass(row.variation)}>{variationText(row.variation)}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ReportShell>
  );
}

/**
 * Suma el consumo anterior por símbolo base.
 * @param rows - Filas del reporte.
 * @returns Mapa símbolo → cantidad anterior.
 */
function sumBySymbol(rows: ConsumptionRow[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.previous === null) continue;
    const current = totals.get(row.base_symbol) ?? 0;
    totals.set(row.base_symbol, current + Number(row.previous));
  }
  return totals;
}

/**
 * Variación porcentual contra el periodo anterior.
 * @param current - Consumo del rango.
 * @param before - Consumo anterior, si existe.
 * @returns Porcentaje o null cuando no hay con qué comparar.
 */
function variation(current: string, before: number | undefined): number | null {
  if (!before || before <= 0) return null;
  return Math.round(((Number(current) - before) / before) * 1000) / 10;
}

function previousHint(
  available: boolean,
  change: number | null,
  before: number | undefined,
  symbol: string,
): string {
  if (!available) return "Sin periodo anterior";
  if (before === undefined) return "Sin consumo antes";
  return `${variationText(change)} · antes ${displayQuantity(String(before), "continua")} ${symbol}`;
}

const CATEGORY_COLORS = ["#1f7a45", "#3d9a62", "#8fd4a8", "#c5e6cf", "#d7efe0"];

function categoryShares(rows: ConsumptionRow[]): Slice[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row.moves);
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, value], index) => ({
      label,
      value,
      color: CATEGORY_COLORS[index] ?? CATEGORY_COLORS[0],
    }));
}

function deltaClass(value: number | null): string {
  if (value === null || value === 0) return "rp__delta";
  return value > 0 ? "rp__delta is-up" : "rp__delta is-down";
}

/**
 * Gráficas de los reportes.
 *
 * Propósito: mostrar barras, comparaciones y tendencias sin librerías.
 * Contexto: solo dibujan las cifras que entrega el backend.
 * @author Cristian Deysdayr Jimenez
 */

import { displayQuantity } from "../services/equivalence.ts";

export type BarItem = {
  id: string;
  label: string;
  caption: string;
  value: number;
  text: string;
  share: number;
};

type BarListProps = {
  items: BarItem[];
  emptyText: string;
};

/**
 * Barras horizontales de una sola serie.
 * @param props - Filas ya calculadas y texto para el vacío.
 * @returns Lista de barras con su valor.
 */
export function BarList({ items, emptyText }: Readonly<BarListProps>) {
  if (items.length === 0) {
    return <p className="chart-empty">{emptyText}</p>;
  }
  const max = Math.max(...items.map((item) => item.value), 0);

  return (
    <ul className="chart-bars">
      {items.map((item) => (
        <li key={item.id} className="chart-bars__row">
          <div className="chart-bars__label">
            <strong>{item.label}</strong>
            <small>{item.caption}</small>
          </div>
          <div className="chart-bars__track">
            <span style={{ width: `${widthOf(item.value, max)}%` }} />
          </div>
          <div className="chart-bars__value">
            <strong>{item.text}</strong>
            <small>{item.share}%</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type CompareItem = {
  id: string;
  label: string;
  now: number;
  before: number;
  nowText: string;
  beforeText: string;
  variation: number | null;
};

/**
 * Barras de dos series: el rango elegido contra el anterior.
 * @param props - Filas con lo actual, lo anterior y su variación.
 * @returns Comparación por producto.
 */
export function ComparisonList({ items }: Readonly<{ items: CompareItem[] }>) {
  if (items.length === 0) {
    return <p className="chart-empty">No hay consumo que comparar en este rango.</p>;
  }
  const max = Math.max(...items.flatMap((item) => [item.now, item.before]), 0);

  return (
    <ul className="chart-compare">
      {items.map((item) => (
        <li key={item.id} className="chart-compare__row">
          <header className="chart-compare__head">
            <strong>{item.label}</strong>
            <span className={variationClass(item.variation)}>{variationLabel(item.variation)}</span>
          </header>
          <div className="chart-compare__series">
            <div className="chart-compare__item is-now">
              <div className="chart-compare__track">
                <span style={{ width: `${widthOf(item.now, max)}%` }} />
              </div>
              <small>Ahora {item.nowText}</small>
            </div>
            <div className="chart-compare__item is-before">
              <div className="chart-compare__track">
                <span style={{ width: `${widthOf(item.before, max)}%` }} />
              </div>
              <small>Antes {item.beforeText}</small>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type SparkPoint = {
  label: string;
  value: number;
  current: boolean;
};

type SparkProps = {
  symbol: string;
  points: SparkPoint[];
};

/**
 * Área de los últimos meses para un símbolo de unidad.
 * @param props - Símbolo y puntos ya agrupados por mes.
 * @returns Mini gráfica con el último valor.
 */
export function Sparkline({ symbol, points }: Readonly<SparkProps>) {
  const width = 260;
  const height = 84;
  const pad = 8;
  const max = Math.max(...points.map((point) => point.value), 0);
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const dots = points.map((point, index) => ({
    ...point,
    x: pad + index * step,
    y: max > 0 ? height - pad - (point.value / max) * (height - pad * 2) : height - pad,
  }));
  const line = dots.map((dot) => `${dot.x.toFixed(1)},${dot.y.toFixed(1)}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const gradient = `spark-${symbol.replace(/[^a-zA-Z0-9]/g, "")}`;
  const last = points[points.length - 1];
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <article className="chart-spark">
      <header className="chart-spark__head">
        <strong>{symbol}</strong>
        <span>{total > 0 ? `${displayQuantity(String(total), "continua")} ${symbol} en 6 meses` : "Sin salidas"}</span>
      </header>
      <svg className="chart-spark__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Tendencia de ${symbol}`}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradient})`} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {dots.map((dot) => (
          <circle
            key={dot.label}
            cx={dot.x}
            cy={dot.y}
            r={dot.current ? 4 : 2.6}
            fill={dot.current ? "currentColor" : "var(--card)"}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <title>{`${dot.label}: ${displayQuantity(String(dot.value), "continua")} ${symbol}`}</title>
          </circle>
        ))}
      </svg>
      <footer className="chart-spark__foot">
        <small>{points[0]?.label ?? ""}</small>
        <small>{last?.current ? `${last.label} (en curso)` : (last?.label ?? "")}</small>
      </footer>
    </article>
  );
}

/**
 * Ancho mínimo de una barra para que se vea aun con valores pequeños.
 * @param value - Valor de la fila.
 * @param max - Valor mayor de la serie.
 * @returns Porcentaje entre 2 y 100.
 */
function widthOf(value: number, max: number): number {
  if (max <= 0) return 2;
  return Math.max(2, Math.round((value / max) * 100));
}

function variationLabel(value: number | null): string {
  if (value === null) return "Sin comparación";
  if (value === 0) return "Igual";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function variationClass(value: number | null): string {
  if (value === null || value === 0) return "chart-compare__delta";
  return value > 0 ? "chart-compare__delta is-up" : "chart-compare__delta is-down";
}

export type Slice = {
  label: string;
  value: number;
  color: string;
};

/**
 * Anillo con la parte de cada estado de stock.
 * @param props - Conteos ya filtrados.
 * @returns Dona y su leyenda.
 */
export function StockDonut({ slices }: Readonly<{ slices: Slice[] }>) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) return <p className="chart-empty">No hay productos con esos filtros.</p>;
  const main = slices[0];
  const percent = Math.round((main.value / total) * 100);
  return (
    <div className="stats-donut">
      <div className="stats-donut__ring" style={{ background: conic(slices, total) }}>
        <div>
          <strong>{percent}%</strong>
          <span>Stock en nivel adecuado</span>
        </div>
      </div>
      <ul className="stats-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{Math.round((slice.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Dos líneas de movimientos por día.
 * @param props - Entradas y salidas del rango.
 * @returns Gráfica o aviso vacío.
 */
export function FlowLines({
  points,
}: Readonly<{ points: { label: string; entradas: number; salidas: number }[] }>) {
  if (points.length === 0 || points.every((point) => point.entradas === 0 && point.salidas === 0)) {
    return <p className="chart-empty">No hay entradas ni salidas en el rango.</p>;
  }
  const width = 320;
  const height = 150;
  const max = Math.max(...points.flatMap((point) => [point.entradas, point.salidas]), 1);
  const step = points.length === 1 ? 0 : (width - 16) / (points.length - 1);
  const yOf = (value: number) => 12 + (1 - value / max) * (height - 28);
  const line = (key: "entradas" | "salidas") =>
    points
      .map((point, index) => `${8 + index * step},${yOf(point[key])}`)
      .join(" ");
  const marks = [0, Math.ceil(points.length / 2), points.length - 1].filter(
    (index, position, all) => all.indexOf(index) === position,
  );

  return (
    <div className="stats-flow">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Entradas y salidas del periodo">
        <polyline points={line("entradas")} fill="none" stroke="#3d9a62" strokeWidth="3" />
        <polyline points={line("salidas")} fill="none" stroke="#1d4d32" strokeWidth="3" />
      </svg>
      <footer>
        {marks.map((index) => (
          <span key={points[index].label}>{points[index].label}</span>
        ))}
      </footer>
    </div>
  );
}

/**
 * Torta simple de categorías.
 * @param props - Partes con color.
 * @returns Dona pequeña y leyenda.
 */
export function CategoryPie({ slices }: Readonly<{ slices: Slice[] }>) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total === 0) return <p className="chart-empty">No hay salidas para agrupar.</p>;
  return (
    <div className="stats-pie">
      <div className="stats-pie__ring" style={{ background: conic(slices, total) }} />
      <ul className="stats-legend">
        {slices.map((slice) => (
          <li key={slice.label}>
            <i style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{Math.round((slice.value / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function conic(slices: Slice[], total: number): string {
  let cursor = 0;
  const stops = slices.map((slice) => {
    const start = cursor;
    cursor += (slice.value / total) * 100;
    return `${slice.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

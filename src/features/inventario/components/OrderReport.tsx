/**
 * Reporte de pedido sugerido.
 *
 * Propósito: comparar el stock inicial con el actual y decir cuánto pedir.
 * Contexto: el inicial solo aparece si hay registro; lo demás va vacío.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { downloadOrderReport, getOrderReport } from "../services/inventoryApi.ts";
import { displayQuantity } from "../services/equivalence.ts";
import { defaultRange } from "../services/reportRange.ts";
import type { OrderReport as OrderReportData, OrderReportRow } from "../types/index.ts";
import { ReportShell, ReportStat } from "./ReportShell.tsx";
import { useCategoryOptions } from "./useReportOptions.ts";

type Props = {
  farmId: number;
  onBack: () => void;
  startLow?: boolean;
};

/**
 * Inicial contra actual por producto, con lo que conviene pedir.
 * @param props - Finca, regreso y si arranca filtrado por bajo stock.
 * @returns Reporte de pedido con descarga.
 */
export function OrderReport({ farmId, onBack, startLow = false }: Readonly<Props>) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [category, setCategory] = useState("");
  const [target, setTarget] = useState<"min" | "doble">("min");
  const [onlyLow, setOnlyLow] = useState(startLow);
  const [data, setData] = useState<OrderReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const categories = useCategoryOptions();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getOrderReport(farmId, { from, to, category, low: onlyLow, target })
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
  }, [farmId, from, to, category, onlyLow, target]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadOrderReport(farmId, { from, to, category, low: onlyLow, target });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el reporte");
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const withoutOpening = rows.filter((row) => !row.initial_known).length;

  return (
    <ReportShell
      title="Qué pedir"
      lead="Stock inicial contra actual. Pedir lleva el producto al mínimo; doble apunta a dos veces el mínimo."
      onBack={onBack}
      downloading={downloading}
      onDownload={() => void download()}
      loading={loading}
      error={error}
      empty={rows.length === 0}
      emptyText="No hay productos con esos filtros."
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
            <span>Pedir hasta</span>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value === "doble" ? "doble" : "min")}
            >
              <option value="min">El mínimo</option>
              <option value="doble">Dos veces el mínimo</option>
            </select>
          </label>
          <label className="rp__check">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={(event) => setOnlyLow(event.target.checked)}
            />
            <span>Solo en o bajo el mínimo</span>
          </label>
        </>
      }
      summary={
        <>
          <ReportStat label="Productos" value={String(data?.count ?? 0)} />
          <ReportStat
            label="En o bajo el mínimo"
            value={String(data?.low ?? 0)}
            tone={(data?.low ?? 0) > 0 ? "warn" : "ok"}
          />
          <ReportStat label="Con algo por pedir" value={String(data?.to_order ?? 0)} tone="down" />
          {withoutOpening > 0 ? (
            <ReportStat
              label="Sin stock inicial"
              value={String(withoutOpening)}
              hint="Sin movimientos en el rango"
            />
          ) : null}
        </>
      }
    >
      <div className="rp__table">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Inicial</th>
              <th>Entradas</th>
              <th>Salidas</th>
              <th>Ajustes</th>
              <th>Actual</th>
              <th>Mínimo</th>
              <th>Falta</th>
              <th>Pedir</th>
              <th>Prestado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id} className={row.is_low ? "rp__row is-low" : "rp__row"}>
                <td>{row.product}</td>
                <td className={row.initial_known ? undefined : "rp__unknown"}>
                  {row.initial === null ? "—" : amount(row.initial, row)}
                </td>
                <td>{amount(row.entries, row)}</td>
                <td>{amount(row.exits, row)}</td>
                <td>{amount(row.adjustments, row)}</td>
                <td className={row.is_low ? "rp__current is-low" : "rp__current"}>
                  {amount(row.current, row)}
                </td>
                <td>{amount(row.min, row)}</td>
                <td>{amount(row.missing, row)}</td>
                <td className="rp__suggested">{amount(row.suggested, row)}</td>
                <td className="rp__lent">{amount(row.lent, row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="rp__legend">
        <strong>Inicial</strong> es el stock registrado justo antes del primer movimiento
        del rango. Si el producto no tuvo movimientos, se muestra el stock actual cuando
        ya existía; si no, queda «—».
      </p>
    </ReportShell>
  );
}

/**
 * Cantidad con su unidad.
 * @param value - Cantidad del reporte.
 * @param row - Fila con la unidad.
 * @returns Texto listo para la tabla.
 */
function amount(value: string, row: OrderReportRow): string {
  return `${displayQuantity(value, "continua")} ${row.unit}`;
}

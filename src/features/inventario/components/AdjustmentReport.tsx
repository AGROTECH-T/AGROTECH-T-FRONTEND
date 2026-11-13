/**
 * Reporte de ajustes.
 *
 * Propósito: ver los reconteos del rango con su motivo y su diferencia.
 * Contexto: los ajustes viejos no tienen motivo y se muestran así.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { downloadAdjustmentReport, getAdjustmentReport } from "../services/inventoryApi.ts";
import { ADJUSTMENT_REASONS } from "../services/adjustmentReasons.ts";
import { formatWhen, signedText } from "../services/reportFormat.ts";
import { defaultRange } from "../services/reportRange.ts";
import type { AdjustmentReport as AdjustmentReportData } from "../types/index.ts";
import { ReportShell, ReportStat } from "./ReportShell.tsx";
import { useProductOptions } from "./useReportOptions.ts";

type Props = {
  farmId: number;
  onBack: () => void;
};

/**
 * Reconteos filtrados por fecha, producto y motivo.
 * @param props - Finca y regreso.
 * @returns Reporte de ajustes con descarga.
 */
export function AdjustmentReport({ farmId, onBack }: Readonly<Props>) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [product, setProduct] = useState("");
  const [reason, setReason] = useState("");
  const [data, setData] = useState<AdjustmentReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const products = useProductOptions(farmId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getAdjustmentReport(farmId, { from, to, product, reason })
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
  }, [farmId, from, to, product, reason]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadAdjustmentReport(farmId, { from, to, product, reason });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el reporte");
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];

  return (
    <ReportShell
      title="Ajustes de inventario"
      lead="Cada reconteo con su motivo, el stock registrado y el conteo real."
      onBack={onBack}
      downloading={downloading}
      onDownload={() => void download()}
      loading={loading}
      error={error}
      empty={rows.length === 0}
      emptyText="No hay ajustes con esos filtros."
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
          <label className="inv-form__field">
            <span>Motivo</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">Todos</option>
              {ADJUSTMENT_REASONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </>
      }
      summary={
        <>
          <ReportStat label="Reconteos" value={String(data?.count ?? 0)} />
          <ReportStat label="Subieron el stock" value={String(data?.up ?? 0)} tone="ok" />
          <ReportStat label="Bajaron el stock" value={String(data?.down ?? 0)} tone="down" />
        </>
      }
    >
      <div className="rp__table">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Motivo</th>
              <th>Observación</th>
              <th>Registrado</th>
              <th>Conteo</th>
              <th>Diferencia</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.when)}</td>
                <td>{row.product}</td>
                <td>
                  <span className={row.reason ? "rp__reason" : "rp__reason is-missing"}>
                    {row.reason_label || "Sin motivo"}
                  </span>
                </td>
                <td className="fh__note">{row.note || "—"}</td>
                <td>{`${row.before} ${row.unit}`}</td>
                <td>{`${row.after} ${row.unit}`}</td>
                <td className={deltaClass(row.difference)}>
                  {signedText(row.difference, row.unit)}
                </td>
                <td>{row.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}

function deltaClass(value: string): string {
  const number = Number(value);
  if (number > 0) return "rp__delta is-up";
  if (number < 0) return "rp__delta is-down";
  return "rp__delta";
}

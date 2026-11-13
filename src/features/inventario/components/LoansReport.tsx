/**
 * Reporte de préstamos.
 *
 * Propósito: ver qué se prestó, a quién y qué sigue pendiente en toda la finca.
 * Contexto: el pendiente sale de lo prestado menos lo devuelto.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { downloadLoanReport, getLoanReport } from "../services/inventoryApi.ts";
import { formatWhen } from "../services/reportFormat.ts";
import { defaultRange } from "../services/reportRange.ts";
import type { LoanReport as LoanReportData } from "../types/index.ts";
import { ReportShell, ReportStat } from "./ReportShell.tsx";
import { useProductOptions } from "./useReportOptions.ts";

type Props = {
  farmId: number;
  onBack: () => void;
};

const STATUS: { id: string; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Pendientes" },
  { id: "closed", label: "Completos" },
];

/**
 * Préstamos filtrados por estado, fecha, persona y producto.
 * @param props - Finca y regreso.
 * @returns Reporte de préstamos con descarga.
 */
export function LoansReport({ farmId, onBack }: Readonly<Props>) {
  const initial = defaultRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [status, setStatus] = useState("all");
  const [person, setPerson] = useState("");
  const [product, setProduct] = useState("");
  const [data, setData] = useState<LoanReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const products = useProductOptions(farmId);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getLoanReport(farmId, { from, to, status, person, product })
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
  }, [farmId, from, to, status, person, product]);

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadLoanReport(farmId, { from, to, status, person, product });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el reporte");
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const people = data?.people ?? [];

  return (
    <ReportShell
      title="Préstamos"
      lead="Lo que salió prestado y lo que todavía falta devolver."
      onBack={onBack}
      downloading={downloading}
      onDownload={() => void download()}
      loading={loading}
      error={error}
      empty={rows.length === 0}
      emptyText="No hay préstamos con esos filtros."
      filters={
        <>
          <label className="inv-form__field">
            <span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inv-form__field">
            <span>Desde</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="inv-form__field">
            <span>Hasta</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
          <label className="inv-form__field">
            <span>Persona</span>
            <input
              type="search"
              value={person}
              placeholder="Nombre o documento"
              onChange={(event) => setPerson(event.target.value)}
            />
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
          <ReportStat label="Préstamos" value={String(data?.count ?? 0)} />
          <ReportStat label="Siguen pendientes" value={String(data?.open ?? 0)} tone="warn" />
          <ReportStat label="Personas con pendiente" value={String(people.length)} />
        </>
      }
    >
      {people.length > 0 ? (
        <div className="rp__people">
          <h3>Pendiente por persona</h3>
          <ul>
            {people.map((item) => (
              <li key={`${item.document}-${item.person}`}>
                <strong>{item.person}</strong>
                <span>Documento {item.document}</span>
                <small>{item.pending}</small>
                <em>
                  {item.loans} {item.loans === 1 ? "préstamo pendiente" : "préstamos pendientes"}
                </em>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rp__table">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Persona</th>
              <th>Documento</th>
              <th>Producto</th>
              <th>Prestado</th>
              <th>Devuelto</th>
              <th>Pendiente</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.when)}</td>
                <td>{row.person}</td>
                <td>{row.document}</td>
                <td>{row.product}</td>
                <td>{`${row.quantity} ${row.unit}`}</td>
                <td>{`${row.returned} ${row.unit}`}</td>
                <td className={Number(row.pending) > 0 ? "rp__delta is-down" : "rp__delta"}>
                  {`${row.pending} ${row.unit}`}
                </td>
                <td>
                  <span className={row.state === "Pendiente" ? "rp__state is-open" : "rp__state"}>
                    {row.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}

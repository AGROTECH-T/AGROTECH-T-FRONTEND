/**
 * Piezas comunes de los reportes.
 *
 * Propósito: que las cuatro pantallas compartan cabecera, filtros, cifras,
 * estados de carga y la descarga en Excel.
 * Contexto: solo se muestran datos registrados; lo que no existe va vacío.
 * @author Cristian Deysdayr Jimenez
 */

import type { ReactNode } from "react";

type Props = {
  title: string;
  lead: string;
  onBack: () => void;
  filters?: ReactNode;
  summary?: ReactNode;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
  downloading?: boolean;
  onDownload?: () => void;
  children?: ReactNode;
};

/**
 * Marco de una pantalla de reporte.
 * @param props - Título, filtros, cifras, estados y contenido.
 * @returns Sección lista para mostrar el tablero o la tabla.
 */
export function ReportShell({
  title,
  lead,
  onBack,
  filters,
  summary,
  loading = false,
  error = "",
  empty = false,
  emptyText = "No hay datos en ese rango.",
  downloading = false,
  onDownload,
  children,
}: Readonly<Props>) {
  return (
    <section className="inv-detail inv-history rp">
      <button type="button" className="btn-secondary" onClick={onBack}>
        ← Volver atrás
      </button>

      <header className="rp__head">
        <div>
          <h2 className="panel__title">{title}</h2>
          <p className="panel__lead">{lead}</p>
        </div>
        {onDownload ? (
          <button
            type="button"
            className="btn-primary rp__download"
            disabled={downloading || loading}
            onClick={onDownload}
          >
            {downloading ? "Preparando..." : "Exportar Reporte"}
          </button>
        ) : null}
      </header>

      {filters ? (
        <div className="rp__filterbox">
          <span className="rp__filtertitle">Filtros</span>
          <div className="inv-filters rp__filters">{filters}</div>
        </div>
      ) : null}

      {summary ? <div className="rp__summary">{summary}</div> : null}

      {loading ? <p className="farm-state">Cargando reporte...</p> : null}
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && empty ? <p className="panel__lead">{emptyText}</p> : null}
      {!loading && !error && !empty ? children : null}

      <p className="rp__note">
        Solo se muestran cifras registradas. Un «—» significa que no hay dato para ese
        punto, no un cero.
      </p>
    </section>
  );
}

type StatProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "down";
};

/**
 * Cifra del resumen de un reporte.
 * @param props - Rótulo, valor, pista y color.
 * @returns Tarjeta de resumen.
 */
export function ReportStat({ label, value, hint, tone }: Readonly<StatProps>) {
  const classes = tone ? `rp__stat is-${tone}` : "rp__stat";
  return (
    <div className={classes}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

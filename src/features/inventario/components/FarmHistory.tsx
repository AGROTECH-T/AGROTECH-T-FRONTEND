/**
 * Historial de movimientos de toda la finca.
 *
 * Propósito: ver el historial como tabla, filtrar por tipo y fechas y
 * descargar en Excel exactamente lo que está filtrado.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { downloadFarmHistory, listFarmMovements } from "../services/inventoryApi.ts";
import { displayQuantity, equivalenceText } from "../services/equivalence.ts";
import type { Movement, MovementKind } from "../types/index.ts";

type Props = {
  farmId: number;
  onBack: () => void;
};

const KINDS: { id: "" | MovementKind; label: string }[] = [
  { id: "", label: "Todos" },
  { id: "entrada", label: "Entradas" },
  { id: "salida", label: "Salidas" },
  { id: "ajuste", label: "Ajustes" },
];

/**
 * Tabla paginada del historial de la finca.
 * @param props - Finca y regreso al listado.
 * @returns Historial con filtros y descarga.
 */
export function FarmHistory({ farmId, onBack }: Readonly<Props>) {
  const [kind, setKind] = useState<"" | MovementKind>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void listFarmMovements(farmId, { kind, from, to, page })
      .then((data) => {
        if (!active) return;
        setRows(data.results);
        setCount(data.count);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [farmId, kind, from, to, page]);

  const download = async () => {
    setError("");
    setDownloading(true);
    try {
      await downloadFarmHistory(farmId, { kind, from, to });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el reporte");
    } finally {
      setDownloading(false);
    }
  };

  const pages = Math.max(1, Math.ceil(count / 15));

  return (
    <section className="inv-detail inv-history">
      <button type="button" className="btn-secondary" onClick={onBack}>
        ← Volver atrás
      </button>
      <header className="panel__header">
        <h2 className="panel__title">Historial de la finca</h2>
        <p className="panel__lead">Los movimientos no se editan. Un error se corrige con un ajuste.</p>
      </header>

      <div className="fh__kinds" role="group" aria-label="Filtrar por tipo de movimiento">
        {KINDS.map((item) => (
          <button
            key={item.id || "all"}
            type="button"
            className={kind === item.id ? "fh__chip is-on" : "fh__chip"}
            aria-pressed={kind === item.id}
            onClick={() => {
              setPage(1);
              setKind(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="inv-filters fh__filters">
        <label className="inv-form__field">
          <span>Desde</span>
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setPage(1);
              setFrom(event.target.value);
            }}
          />
        </label>
        <label className="inv-form__field">
          <span>Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setPage(1);
              setTo(event.target.value);
            }}
          />
        </label>
        <div className="fh__download">
          <button
            type="button"
            className="btn-primary"
            disabled={downloading || loading}
            onClick={() => void download()}
          >
            {downloading ? "Preparando..." : "Descargar reporte"}
          </button>
        </div>
      </div>

      {loading ? <p className="farm-state">Cargando historial...</p> : null}
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="panel__lead">No hay movimientos en ese rango.</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="fh__table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((move) => (
                <HistoryRow key={move.id} move={move} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="inv-form__actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Anterior
        </button>
        <span className="inv-equivalence">
          Página {page} de {pages} · {count} movimiento{count === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={page >= pages}
          onClick={() => setPage((current) => current + 1)}
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}

/**
 * Fila del historial con la cantidad ya firmada.
 * @param props - Movimiento a mostrar.
 * @returns Fila de la tabla.
 */
function HistoryRow({ move }: Readonly<{ move: Movement }>) {
  const equivalent = equivalenceText(move.quantity, inferFactor(move), move.base_symbol);
  const when = new Date(move.created_at).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <tr>
      <td>{when}</td>
      <td>{move.product_name}</td>
      <td>
        <span className={`fh__kind is-${move.kind}`}>{labelKind(move.kind)}</span>
      </td>
      <td>
        {signedAmount(move)}
        {equivalent ? <small className="fh__eq">{equivalent}</small> : null}
      </td>
      <td>{move.created_by_name || "Sin nombre"}</td>
      <td className="fh__note">{move.note || "—"}</td>
    </tr>
  );
}

function inferFactor(move: Movement): string {
  const qty = Number(move.quantity);
  const base = Number(move.quantity_base);
  if (!Number.isFinite(qty) || qty === 0 || !Number.isFinite(base)) return "1";
  return String(base / qty);
}

function labelKind(kind: MovementKind): string {
  if (kind === "entrada") return "Entrada";
  if (kind === "salida") return "Salida";
  return "Ajuste";
}

function signedAmount(move: Movement): string {
  let value = Number(move.quantity);
  if (move.kind === "ajuste") value = Number(move.stock_after) - Number(move.stock_before);
  if (move.kind === "salida") value = -Math.abs(value);
  const text = displayQuantity(String(Math.abs(value)), "continua");
  if (value > 0) return `+${text} ${move.unit_label}`;
  if (value < 0) return `−${text} ${move.unit_label}`;
  return `0 ${move.unit_label}`;
}

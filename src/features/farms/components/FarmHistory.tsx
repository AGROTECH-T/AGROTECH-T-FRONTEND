/**
 * Historial de auditoría de una finca.
 *
 * Propósito: mostrar los eventos de auditoría de forma legible, bajo demanda.
 * Contexto: solo para administradores; la autorización real está en el backend.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { listFarmHistory } from "../services/farmsApi.ts";
import { formatDate } from "../services/date.ts";
import { describeEvent, reasonLabel, totalPages } from "../services/eventDescription.ts";
import type { HistoryPage } from "../types/index.ts";

const PAGE_SIZE = 20;

type Props = {
  farmId: number;
  /** Abre y carga el historial al montarse, sin botón previo (uso en pestaña). */
  autoOpen?: boolean;
};

/**
 * Sección de historial con carga bajo demanda y paginación de servidor.
 * @param props - Identificador de la finca.
 * @returns Sección de historial.
 */
export function FarmHistory({ farmId, autoOpen = false }: Readonly<Props>) {
  const [expanded, setExpanded] = useState(autoOpen);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(targetPage: number) {
    setLoading(true);
    setError("");
    try {
      const result = await listFarmHistory(farmId, targetPage, PAGE_SIZE);
      setData(result);
      setPage(targetPage);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo cargar el historial",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoOpen) void load(1);
    // Solo al montar o al cambiar de finca; la paginación recarga por su cuenta.
  }, [autoOpen, farmId]);

  async function open() {
    setExpanded(true);
    await load(1);
  }

  if (!expanded) {
    return (
      <div className="farm-history">
        <button type="button" className="btn-secondary" onClick={() => void open()}>
          Ver historial
        </button>
      </div>
    );
  }

  const pages = data ? totalPages(data.count, PAGE_SIZE) : 0;

  return (
    <section className="farm-history" aria-label="Historial de la finca">
      <h3 className="farm-form__title">Historial</h3>

      {loading ? (
        <p className="farm-state" role="status">
          Cargando historial...
        </p>
      ) : null}

      {!loading && error ? (
        <div className="farm-state" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void load(page)}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && data && data.results.length === 0 ? (
        <p className="farm-state" role="status">
          No hay eventos registrados.
        </p>
      ) : null}

      {!loading && !error && data && data.results.length > 0 ? (
        <ul className="farm-history__list">
          {data.results.map((event, index) => (
            <li
              key={`${event.created_at}-${event.entity_id}-${index}`}
              className="farm-history__item"
            >
              <span className="farm-history__label">{event.event_type_label}</span>
              <span className="farm-history__meta">
                {event.actor_display ? `${event.actor_display} · ` : ""}
                {formatDate(event.created_at)}
              </span>
              <span className="farm-history__desc">{describeEvent(event)}</span>
              {event.reason ? (
                <span className="farm-history__desc">Motivo: {reasonLabel(event.reason)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && data && data.results.length > 0 ? (
        <div className="farm-history__pagination">
          <button
            type="button"
            className="btn-secondary"
            disabled={!data.previous}
            onClick={() => void load(page - 1)}
          >
            Anterior
          </button>
          <span className="farm-history__page">
            Página {page} de {pages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={!data.next}
            onClick={() => void load(page + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  );
}

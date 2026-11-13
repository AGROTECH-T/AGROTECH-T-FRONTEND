/**
 * Presentación de un historial de auditoría paginado.
 *
 * Propósito: pintar carga, error, vacío, eventos y paginación con las mismas
 * clases del historial de la finca.
 * Contexto: componente sin estado; quien lo usa decide cuándo consultar.
 * @author Cristian Deysdayr Jimenez
 */

import { formatDate } from "../services/date.ts";
import { describeEvent, reasonLabel } from "../services/eventDescription.ts";
import type { HistoryView } from "../services/historyState.ts";

type Props = {
  view: HistoryView;
  emptyText?: string;
  loadingText?: string;
  onPage: (page: number) => void;
  onRetry: () => void;
};

/**
 * Lista de eventos con paginación de servidor.
 * @param props - Vista derivada y callbacks.
 * @returns Estado o lista de eventos.
 */
export function HistoryEvents({
  view,
  emptyText = "No hay eventos registrados.",
  loadingText = "Cargando historial...",
  onPage,
  onRetry,
}: Readonly<Props>) {
  if (view.kind === "idle") return null;

  if (view.kind === "loading") {
    return (
      <p className="farm-state" role="status">
        {loadingText}
      </p>
    );
  }

  if (view.kind === "error") {
    return (
      <div className="farm-state" role="alert">
        <p>{view.message}</p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (view.kind === "empty") {
    return (
      <p className="farm-state" role="status">
        {emptyText}
      </p>
    );
  }

  return (
    <>
      <ul className="farm-history__list">
        {view.data.results.map((event, index) => (
          <li
            key={`${event.created_at}-${event.event_type}-${event.entity_id}-${index}`}
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
      <div className="farm-history__pagination">
        <button
          type="button"
          className="btn-secondary"
          disabled={!view.hasPrevious}
          onClick={() => onPage(view.page - 1)}
        >
          Anterior
        </button>
        <span className="farm-history__page">
          Página {view.page} de {view.pages}
        </span>
        <button
          type="button"
          className="btn-secondary"
          disabled={!view.hasNext}
          onClick={() => onPage(view.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </>
  );
}

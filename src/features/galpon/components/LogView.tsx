/**
 * Vista de bitácora.
 *
 * Propósito: registrar, corregir y borrar los hechos de un lote en una
 * tabla compacta. La nota larga se abre con Ver; el filtro cambia columnas.
 * Contexto: una observación no se presenta como medición ni como diagnóstico.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import {
  correctEvent,
  createEvent,
  deleteEvent,
  EVENT_PAGE_SIZE,
  listEvents,
} from "../services/galponApi.ts";
import type { Lot, LotEvent } from "../types/index.ts";
import { EventForm } from "./EventForm.tsx";
import {
  ActionBtn,
  Empty,
  EVENT_KINDS,
  GalponCard,
  IconPencil,
  IconTrash,
  kindLabel,
} from "./galponUi.tsx";
import {
  logCell,
  logColumns,
  logDateParts,
  logDetail,
  logDetailTitle,
  type LogColumnId,
} from "./logColumns.ts";

type Props = {
  farmId: number;
  lot: Lot;
  canWrite: boolean;
  onSaved: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

/**
 * Bitácora del lote con su formulario.
 * @param props - Lote y manejadores.
 * @returns Tabla de registros con sus acciones.
 */
export function LogView({ farmId, lot, canWrite, onSaved, notify }: Readonly<Props>) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LotEvent[]>([]);
  const [count, setCount] = useState(0);
  const [kinds, setKinds] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState<string | null>(null);
  const [editing, setEditing] = useState<LotEvent | null>(null);
  const [removing, setRemoving] = useState<LotEvent | null>(null);
  const [looking, setLooking] = useState<LotEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setRows([]);
    setError("");
    try {
      const data = await listEvents(farmId, lot.id, { kind: filter, page });
      setRows(data.results);
      setCount(data.count);
      setKinds(data.kinds);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la bitácora");
    } finally {
      setLoading(false);
    }
  }, [farmId, lot.id, filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalAll = useMemo(
    () => Object.values(kinds).reduce((sum, value) => sum + value, 0),
    [kinds],
  );
  const presentKinds = useMemo(
    () => EVENT_KINDS.filter((kind) => (kinds[kind.id] ?? 0) > 0),
    [kinds],
  );
  const pages = Math.max(1, Math.ceil(count / EVENT_PAGE_SIZE));
  const columns = useMemo(() => logColumns(filter), [filter]);
  const grid = columns.map((column) => column.width).join(" ");

  const abierto = lot.status === "abierto";
  const puedeAnotar = canWrite && abierto;

  const openWriter = (kind: string) => {
    setError("");
    setWriting(kind);
  };

  const save = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    const wasEdit = Boolean(editing);
    try {
      if (editing) {
        await correctEvent(farmId, editing.id, body);
        notify("Registro corregido. Se guardó el valor anterior.");
        setEditing(null);
      } else {
        await createEvent(farmId, lot.id, body);
        notify("Registro guardado en la bitácora.");
        setWriting(null);
      }
      await onSaved();
      if (!wasEdit && page !== 1) {
        setPage(1);
      } else {
        await load();
      }
    } catch (cause) {
      const text = message(cause, "No se pudo guardar el registro");
      setError(text);
      notify(text, "warn");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    setError("");
    try {
      await deleteEvent(farmId, removing.id);
      notify("Registro eliminado y saldo del lote corregido.");
      setRemoving(null);
      if (rows.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
      await onSaved();
    } catch (cause) {
      const text = message(cause, "No se pudo eliminar el registro");
      setError(text);
      notify(text, "warn");
      setRemoving(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GalponCard
        title="Bitácora"
        subtitle={`Lote ${lot.code}. Rondas, muertes, alimento y demás hechos.`}
        action={
          <div className="gp-log__tools">
            {presentKinds.length > 1 ? (
              <label className="gp-tool-field">
                <span className="visually-hidden">Filtrar bitácora</span>
                <select
                  value={filter}
                  onChange={(event) => {
                    setPage(1);
                    setFilter(event.target.value);
                  }}
                >
                  <option value="">Todos ({totalAll})</option>
                  {presentKinds.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({kinds[item.id]})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {puedeAnotar ? (
              <button type="button" className="btn-primary gp-new" onClick={() => openWriter("ronda")}>
                <span aria-hidden="true">+</span>
                Crear registro
              </button>
            ) : null}
          </div>
        }
        wide
      >
        {error ? (
          <p className="galpon__error" role="alert">
            {error}
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <p className="gp-log__status">Cargando bitácora…</p>
        ) : totalAll === 0 ? (
          <Empty
            title="Bitácora vacía"
            action={
              puedeAnotar ? (
                <button type="button" className="btn-primary gp-new" onClick={() => openWriter("ronda")}>
                  <span aria-hidden="true">+</span>
                  Crear registro
                </button>
              ) : undefined
            }
          >
            Empieza con una ronda: cuenta qué viste y qué hiciste en el lote.
          </Empty>
        ) : count === 0 ? (
          <Empty
            action={
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setPage(1);
                  setFilter("");
                }}
              >
                Ver todos
              </button>
            }
          >
            No hay registros de ese tipo.
          </Empty>
        ) : (
          <>
            <div className="gp-log" style={{ ["--gp-log-cols" as string]: grid }}>
              <div className="gp-log__head" aria-hidden="true">
                {columns.map((column) => (
                  <span key={column.id}>{column.label}</span>
                ))}
              </div>
              {rows.map((event) => (
                <article key={event.id} className="gp-log__row">
                  {columns.map((column) => (
                    <LogCell
                      key={column.id}
                      column={column.id}
                      label={column.label}
                      event={event}
                      canWrite={puedeAnotar}
                      onLook={() => setLooking(event)}
                      onEdit={() => {
                        setError("");
                        setEditing(event);
                      }}
                      onRemove={() => setRemoving(event)}
                    />
                  ))}
                </article>
              ))}
            </div>
            {pages > 1 ? (
              <nav className="gp-log__pager" aria-label="Páginas de la bitácora">
                <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Anterior
                </button>
                <span>
                  Página {page} de {pages} · {count} registros
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={page >= pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </button>
              </nav>
            ) : null}
          </>
        )}
      </GalponCard>

      {looking ? (
        <FormWindow title={logDetailTitle(looking)} onClose={() => setLooking(null)}>
          <dl className="gp-detail__facts gp-log__detail">
            {logDetail(looking).map((row) => (
              <div key={row.label} className={row.label === "Nota" ? "gp-log__detail-note" : undefined}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </FormWindow>
      ) : null}

      {writing !== null || editing ? (
        <EventForm
          key={editing?.id ?? writing ?? "nuevo"}
          event={editing}
          initialKind={writing ?? "ronda"}
          saving={saving}
          error={error}
          onClose={() => {
            setWriting(null);
            setEditing(null);
            setError("");
          }}
          onSave={(body) => void save(body)}
        />
      ) : null}

      {removing ? (
        <ConfirmModal
          text={`¿Eliminar este registro de ${kindLabel(removing.kind).toLowerCase()}? Si restaba aves, el saldo del lote vuelve a subir.`}
          confirmLabel="Sí, eliminar"
          closeLabel="No, volver"
          onConfirm={() => void remove()}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </>
  );
}

type CellProps = {
  column: LogColumnId;
  label: string;
  event: LotEvent;
  canWrite: boolean;
  onLook: () => void;
  onEdit: () => void;
  onRemove: () => void;
};

const BARE_COLUMNS = new Set<LogColumnId>(["fecha", "hora", "tipo", "acciones"]);

/**
 * Celda de la bitácora: dato recortado, pastilla de tipo o acciones.
 * @param props - Columna, registro y acciones.
 * @returns Contenido de la celda.
 */
function LogCell({ column, label, event, canWrite, onLook, onEdit, onRemove }: Readonly<CellProps>) {
  const marked = BARE_COLUMNS.has(column) ? undefined : label;

  if (column === "fecha") {
    const parts = logDateParts(event.occurred_at);
    return (
      <div className="gp-log__date">
        <strong>{parts.day}</strong>
        {parts.weekday ? <small>{parts.weekday}</small> : null}
      </div>
    );
  }

  if (column === "tipo") {
    return <span className={`gp-kind gp-kind--${event.kind}`}>{logCell("tipo", event)}</span>;
  }

  if (column === "nota") {
    const note = logCell("nota", event);
    return (
      <span className="gp-log__note" data-label={marked} title={note === "—" ? undefined : note}>
        {note}
      </span>
    );
  }

  if (column === "acciones") {
    return (
      <div className="gp-log__actions">
        <button type="button" className="gp-log__ver" onClick={onLook}>
          Ver
        </button>
        {canWrite ? (
          <>
            <ActionBtn label="Corregir" onClick={onEdit}>
              <IconPencil />
            </ActionBtn>
            <ActionBtn label="Eliminar" danger onClick={onRemove}>
              <IconTrash />
            </ActionBtn>
          </>
        ) : null}
      </div>
    );
  }

  if (column === "hora") {
    return (
      <time dateTime={event.occurred_at} data-label={marked}>
        {logCell("hora", event)}
      </time>
    );
  }

  return (
    <span className={column === "cantidad" ? "gp-log__qty" : "gp-log__who"} data-label={marked}>
      {logCell(column, event)}
    </span>
  );
}

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

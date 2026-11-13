/**
 * Vista de bitácora.
 *
 * Propósito: registrar, corregir y borrar los hechos de un lote.
 * Contexto: una observación no se presenta como medición ni como diagnóstico.
 * @author Cristian Deysdayr Jimenez
 */

import { useMemo, useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { correctEvent, createEvent, deleteEvent } from "../services/galponApi.ts";
import type { Lot, LotEvent } from "../types/index.ts";
import { EventForm } from "./EventForm.tsx";
import {
  ActionBtn,
  ATTENTION,
  dayLabel,
  dayText,
  Empty,
  EVENT_KINDS,
  GalponCard,
  IconPencil,
  IconTrash,
  eventTitle,
  kindLabel,
  numberText,
  timeText,
  unitText,
} from "./galponUi.tsx";

type Props = {
  farmId: number;
  lot: Lot;
  events: LotEvent[];
  canWrite: boolean;
  onSaved: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

type DayGroup = {
  day: string;
  label: string;
  items: LotEvent[];
};

/**
 * Agrupa los registros por día para leer una bitácora larga.
 * @param events - Registros ya ordenados del más reciente al más antiguo.
 * @returns Grupos por día.
 */
function groupByDay(events: LotEvent[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const day = dayText(event.occurred_at);
    const current = groups.at(-1);
    if (current && current.day === day) current.items.push(event);
    else groups.push({ day, label: dayLabel(event.occurred_at), items: [event] });
  }
  return groups;
}

/**
 * Bitácora del lote con su formulario.
 * @param props - Lote, eventos y manejadores.
 * @returns Tabla de registros con sus acciones.
 */
export function LogView({ farmId, lot, events, canWrite, onSaved, notify }: Readonly<Props>) {
  const [filter, setFilter] = useState("");
  const [writing, setWriting] = useState<string | null>(null);
  const [editing, setEditing] = useState<LotEvent | null>(null);
  const [removing, setRemoving] = useState<LotEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      if (event.kind === "descarte") continue;
      map.set(event.kind, (map.get(event.kind) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const presentKinds = useMemo(
    () => EVENT_KINDS.filter((kind) => counts.has(kind.id)),
    [counts],
  );

  const visible = useMemo(() => {
    const items = events.filter((event) => event.kind !== "descarte");
    return filter ? items.filter((event) => event.kind === filter) : items;
  }, [events, filter]);

  const groups = useMemo(() => groupByDay(visible), [visible]);

  const abierto = lot.status === "abierto";
  const puedeAnotar = canWrite && abierto;

  const openWriter = (kind: string) => {
    setError("");
    setWriting(kind);
  };

  const save = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
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
        subtitle="Rondas, muertes, alimento y demás hechos del lote."
        action={
          <div className="gp-log__tools">
            {presentKinds.length > 1 ? (
              <label className="gp-tool-field">
                <span className="visually-hidden">Filtrar bitácora</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="">Todos ({events.length})</option>
                  {presentKinds.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({counts.get(item.id)})
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

        {events.length === 0 ? (
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
        ) : visible.length === 0 ? (
          <Empty action={<button type="button" className="btn-secondary" onClick={() => setFilter("")}>Ver todos</button>}>
            No hay registros de ese tipo.
          </Empty>
        ) : (
          <div className="gp-log">
            <div className="gp-log__head" aria-hidden="true">
              <span>Hora</span>
              <span>Tipo</span>
              <span>Cantidad</span>
              <span>Quién</span>
              <span>Nota</span>
              <span>Acciones</span>
            </div>
            {groups.map((group) => (
              <section key={group.day} className="gp-log__group" aria-label={group.label}>
                <h3 className="gp-log__day">{group.label}</h3>
                {group.items.map((event) => {
                  const attention = ATTENTION[event.attention] ?? ATTENTION.informativo;
                  const value = event.observed_value
                    ? `${numberText(event.observed_value)} ${unitText(event.unit, event.observed_value)}${event.estimated ? " est." : ""}`
                    : "—";
                  const tone =
                    attention.tone === "alert"
                      ? " is-alert"
                      : attention.tone === "warn"
                        ? " is-warn"
                        : "";
                  const who = [
                    event.responsible,
                    event.place,
                    event.confirmed ? "confirmado" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const nota = [
                    event.notes,
                    event.corrections.length
                      ? `Corregido ${event.corrections.length === 1 ? "1 vez" : `${event.corrections.length} veces`}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <article key={event.id} className={`gp-log__row${tone}`}>
                      <time dateTime={event.occurred_at}>{timeText(event.occurred_at)}</time>
                      <strong>{eventTitle(event.kind, event.payload)}</strong>
                      <span className="gp-log__qty">{value}</span>
                      <span className="gp-log__who" title={who}>
                        {who}
                      </span>
                      <span className="gp-log__note" title={nota || undefined}>
                        {nota || "—"}
                      </span>
                      {puedeAnotar ? (
                        <div className="gp-log__actions">
                          <ActionBtn
                            label="Corregir"
                            onClick={() => {
                              setError("");
                              setEditing(event);
                            }}
                          >
                            <IconPencil />
                          </ActionBtn>
                          <ActionBtn label="Eliminar" danger onClick={() => setRemoving(event)}>
                            <IconTrash />
                          </ActionBtn>
                        </div>
                      ) : (
                        <span className="gp-log__actions" />
                      )}
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </GalponCard>

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

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

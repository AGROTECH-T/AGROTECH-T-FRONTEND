/**
 * Lista de galpones.
 *
 * Propósito: mostrar cada galpón como una tarjeta y permitir abrirlo, crearlo,
 * editarlo o eliminarlo.
 * Contexto: al abrir un galpón se ven sus lotes; solo el administrador u
 * operador de la finca puede escribir.
 * @author Cristian Deysdayr Jimenez
 */

import { useMemo, useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { createHouse, deleteHouse, updateHouse } from "../services/galponApi.ts";
import type { House, HouseDraft } from "../types/index.ts";
import { HouseForm } from "./HouseForm.tsx";
import {
  ActionBtn,
  Empty,
  Guide,
  HOUSE_STATUS,
  houseStatus,
  IconPencil,
  IconTrash,
  Pill,
} from "./galponUi.tsx";

type Props = {
  farmId: number;
  houses: House[];
  canWrite: boolean;
  onOpen: (house: House) => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

const GUIDE = {
  title: "Cómo se usa Galpones",
  lead: "Aprende a crear los galpones, abrir sus lotes y registrar la bitácora.",
  steps: [
    "Crea el galpón con su nombre. Lo demás lo agregas después, cuando lo sepas.",
    "Abre el galpón y crea su primer lote con las aves que llegaron.",
    "Dentro del lote registra la bitácora y revisa sus indicadores.",
    "Cuando salgan las aves, cierra el lote. En el mismo galpón puedes abrir otro después.",
  ],
  example:
    "En Galpón 1 llegaron 130 aves el 11 de noviembre: abres el galpón y creas el lote L-001. Si al día 5 mueren 3, lo anotas en su bitácora y el saldo vivo queda en 127.",
};

/**
 * Tarjetas de galpones con sus acciones.
 * @param props - Finca, galpones, permiso de escritura y avisos.
 * @returns Buscador, resumen y rejilla de galpones con sus ventanas.
 */
export function HousesView({
  farmId,
  houses,
  canWrite,
  onOpen,
  onChanged,
  notify,
}: Readonly<Props>) {
  const [editing, setEditing] = useState<House | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<House | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const save = async (draft: HouseDraft) => {
    setSaving(true);
    setError("");
    try {
      const body = payload(draft);
      if (editing) {
        await updateHouse(farmId, editing.id, body);
        notify(`Galpón “${body.name}” actualizado.`);
      } else {
        await createHouse(farmId, body);
        notify(`Galpón “${body.name}” creado.`);
      }
      setEditing(null);
      setCreating(false);
      await onChanged();
    } catch (cause) {
      setError(message(cause, "No se pudo guardar el galpón"));
      notify(message(cause, "No se pudo guardar el galpón"), "warn");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setSaving(true);
    setError("");
    try {
      await deleteHouse(farmId, removing.id);
      notify(`Galpón “${removing.name}” eliminado.`);
      setRemoving(null);
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo eliminar el galpón");
      setError(text);
      notify(text, "warn");
      setRemoving(null);
    } finally {
      setSaving(false);
    }
  };

  const ocupados = houses.filter((house) => house.status === "ocupado").length;
  const avesVivas = houses.reduce((total, house) => total + (house.live_count ?? 0), 0);

  const estados = useMemo(() => {
    const seen = new Set(houses.map((house) => house.status));
    return Object.entries(HOUSE_STATUS).filter(([id]) => seen.has(id));
  }, [houses]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return houses.filter((house) => {
      if (status && house.status !== status) return false;
      if (!needle) return true;
      return (
        house.name.toLowerCase().includes(needle) ||
        house.location.toLowerCase().includes(needle)
      );
    });
  }, [houses, query, status]);

  const limpiar = () => {
    setQuery("");
    setStatus("");
  };

  return (
    <div className="gp-layout">
      <Guide title={GUIDE.title} lead={GUIDE.lead} steps={GUIDE.steps} example={GUIDE.example} />

      {error ? (
        <p className="galpon__error" role="alert">
          {error}
        </p>
      ) : null}

      {houses.length === 0 ? (
        <Empty
          title="Todavía no hay galpones"
          action={
            canWrite ? (
              <button type="button" className="btn-primary gp-new" onClick={() => setCreating(true)}>
                <span aria-hidden="true">+</span>
                Crear galpón
              </button>
            ) : undefined
          }
        >
          Crea el primero y escribe solo lo que sepas. Después le agregas sus lotes.
        </Empty>
      ) : (
        <>
          <p className="gp-glance">
            <strong>{houses.length}</strong> galpones · <strong>{ocupados}</strong> ocupados
            {avesVivas > 0 ? (
              <>
                {" "}
                · <strong>{avesVivas}</strong> aves vivas
              </>
            ) : null}
          </p>

          <div className="gp-toolbar">
            {canWrite ? (
              <button type="button" className="btn-primary gp-new" onClick={() => setCreating(true)}>
                <span aria-hidden="true">+</span>
                Crear galpón
              </button>
            ) : null}

            {estados.length > 1 ? (
              <label className="gp-tool-field">
                <span>Estado</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">Todos</option>
                  {estados.map(([id, item]) => (
                    <option key={id} value={id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="gp-search">
              <span className="visually-hidden">Buscar galpón</span>
              <input
                type="search"
                value={query}
                placeholder="Buscar galpón..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <Empty action={<button type="button" className="btn-secondary" onClick={limpiar}>Limpiar filtros</button>}>
              No hay galpones que coincidan con la búsqueda.
            </Empty>
          ) : (
            <div className="gp-houses">
              {filtered.map((house) => {
                const state = houseStatus(house.status);
                const lotes = house.lots_count === 1 ? "1 lote" : `${house.lots_count} lotes`;
                return (
                  <article key={house.id} className={`gp-house is-${house.status}`}>
                    <header className="gp-house__head">
                      <div>
                        <span className="gp-house__eyebrow">
                          {house.location || "Sin ubicación"}
                        </span>
                        <h3>{house.name}</h3>
                      </div>
                      <Pill label={state.label} tone={state.tone} />
                    </header>

                    <dl className="gp-house__facts">
                      <div>
                        <dt>Aves vivas</dt>
                        <dd>
                          {house.open_lot_id != null
                            ? `${house.live_count ?? 0} aves`
                            : "Sin lote abierto"}
                        </dd>
                      </div>
                      <div>
                        <dt>Lote actual</dt>
                        <dd>{house.open_lot_code || "Ninguno"}</dd>
                      </div>
                      <div>
                        <dt>Historial</dt>
                        <dd>{lotes}</dd>
                      </div>
                    </dl>

                    <footer className="gp-house__actions">
                      <button type="button" className="btn-primary" onClick={() => onOpen(house)}>
                        Abrir galpón
                      </button>
                      {canWrite ? (
                        <>
                          <ActionBtn
                            label="Editar"
                            onClick={() => {
                              setError("");
                              setEditing(house);
                            }}
                          >
                            <IconPencil />
                          </ActionBtn>
                          <ActionBtn label="Eliminar" danger onClick={() => setRemoving(house)}>
                            <IconTrash />
                          </ActionBtn>
                        </>
                      ) : null}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {creating || editing ? (
        <HouseForm
          house={editing}
          saving={saving}
          error={error}
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setError("");
          }}
          onSave={(draft) => void save(draft)}
        />
      ) : null}

      {removing ? (
        <ConfirmModal
          text={avisoEliminacion(removing)}
          confirmLabel="Sí, eliminar"
          closeLabel="No, volver"
          onConfirm={() => void remove()}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}

function avisoEliminacion(house: House): string {
  if (house.lots_count === 0) {
    return `¿Eliminar "${house.name}"? Se quita de la lista y no se puede deshacer.`;
  }
  const lotes = house.lots_count === 1 ? "su 1 lote" : `sus ${house.lots_count} lotes`;
  return `¿Eliminar "${house.name}"? También se borran ${lotes} y toda su bitácora. Esto no se puede deshacer.`;
}

function payload(draft: HouseDraft): Record<string, unknown> {
  return {
    name: draft.name.trim(),
    location: draft.location.trim(),
    length_m: draft.length_m || null,
    width_m: draft.width_m || null,
    capacity: draft.capacity ? Number(draft.capacity) : null,
    usual_birds: draft.usual_birds ? Number(draft.usual_birds) : null,
    bale_kg: draft.bale_kg || null,
    bales_per_drum: draft.bales_per_drum || null,
    feed_mode: draft.feed_mode,
    cycle_days: draft.cycle_days ? Number(draft.cycle_days) : null,
  };
}

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

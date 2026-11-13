/**
 * Lotes de un galpón.
 *
 * Propósito: crear y administrar los lotes que han entrado a este galpón.
 * Contexto: un galpón conserva todos sus lotes; puede tener varios abiertos.
 * @author Cristian Deysdayr Jimenez
 */

import { useMemo, useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import {
  closeLot,
  deleteLot,
  openLot as createLot,
  reopenLot,
  updateLot,
} from "../services/galponApi.ts";
import type { House, Lot, LotDraft } from "../types/index.ts";
import { LotForm } from "./LotForm.tsx";
import {
  ActionBtn,
  ageText,
  BalanceBar,
  Empty,
  Field,
  GalponCard,
  IconLock,
  IconPencil,
  IconTrash,
  IconUnlock,
  lotStatus,
  Pill,
  stageLabel,
} from "./galponUi.tsx";

type Props = {
  farmId: number;
  house: House;
  lots: Lot[];
  canWrite: boolean;
  onOpenLot: (lotId: number) => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

/**
 * Lista de lotes con sus acciones.
 * @param props - Galpón, sus lotes, permiso y avisos.
 * @returns Tarjeta con los lotes y sus ventanas.
 */
export function LotsSection({
  farmId,
  house,
  lots,
  canWrite,
  onOpenLot,
  onChanged,
  notify,
}: Readonly<Props>) {
  const [editing, setEditing] = useState<Lot | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Lot | null>(null);
  const [closing, setClosing] = useState<Lot | null>(null);
  const [closeNote, setCloseNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const abierto = lots.find((lot) => lot.status === "abierto") ?? null;
  const cerrados = lots.filter((lot) => lot.status === "cerrado").length;
  const resumenLotes =
    lots.length === 0
      ? "Cuando lleguen las aves, crea el primer lote."
      : `${abierto ? `Lote ${abierto.code} abierto` : "Sin lote abierto"} · ${cerrados} cerrado${cerrados === 1 ? "" : "s"}`;

  const ordenados = useMemo(
    () =>
      [...lots].sort((left, right) => {
        const openDiff = Number(right.status === "abierto") - Number(left.status === "abierto");
        if (openDiff !== 0) return openDiff;
        return new Date(right.arrived_at).getTime() - new Date(left.arrived_at).getTime();
      }),
    [lots],
  );

  const save = async (draft: LotDraft) => {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateLot(farmId, editing.id, editablePayload(draft));
        notify(`Lote ${draft.code.trim()} actualizado.`);
        setEditing(null);
      } else {
        await createLot(farmId, newPayload(draft));
        notify(`Lote ${draft.code.trim()} abierto.`);
        setCreating(false);
      }
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo guardar el lote");
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
      await deleteLot(farmId, removing.id);
      notify(`Lote ${removing.code} eliminado.`);
      setRemoving(null);
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo eliminar el lote");
      setError(text);
      notify(text, "warn");
      setRemoving(null);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    if (!closing) return;
    setSaving(true);
    setError("");
    try {
      await closeLot(farmId, closing.id, closeNote);
      notify(`Lote ${closing.code} cerrado.`);
      setClosing(null);
      setCloseNote("");
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo cerrar el lote");
      setError(text);
      notify(text, "warn");
    } finally {
      setSaving(false);
    }
  };

  const reopen = async (lot: Lot) => {
    setSaving(true);
    setError("");
    try {
      await reopenLot(farmId, lot.id);
      notify(`Lote ${lot.code} reabierto. Ya puedes seguir anotando.`);
      setClosing(null);
      setCloseNote("");
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo reabrir el lote");
      setError(text);
      notify(text, "warn");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <GalponCard
        title="Lotes del galpón"
        subtitle={
          lots.length === 0
            ? resumenLotes
            : `${resumenLotes}. Aquí queda el historial de todos sus lotes.`
        }
        action={
          canWrite ? (
            <button
              type="button"
              className="btn-primary gp-new"
              onClick={() => {
                setError("");
                setCreating(true);
              }}
            >
              <span aria-hidden="true">+</span>
              Crear lote
            </button>
          ) : null
        }
        wide
      >
        {error ? (
          <p className="galpon__error" role="alert">
            {error}
          </p>
        ) : null}

        {lots.length === 0 ? (
          <Empty
            title="Sin lotes todavía"
            action={
              canWrite ? (
                <button
                  type="button"
                  className="btn-primary gp-new"
                  onClick={() => {
                    setError("");
                    setCreating(true);
                  }}
                >
                  <span aria-hidden="true">+</span>
                  Crear lote
                </button>
              ) : undefined
            }
          >
            Crea el primer lote cuando lleguen las aves a este galpón.
          </Empty>
        ) : (
          <ul className="gp-list">
            <li className="gp-list__head" aria-hidden="true">
              <span>Lote</span>
              <span>Estado</span>
              <span>Aves vivas</span>
              <span>Acciones</span>
            </li>
            {ordenados.map((lot) => {
              const status = lotStatus(lot.status);
              const sobrevive =
                lot.received > 0 ? Math.round((lot.live_count / lot.received) * 100) : 0;
              return (
                <li
                  key={lot.id}
                  className={lot.status === "abierto" ? "gp-row is-open" : "gp-row"}
                >
                  <div className="gp-row__name">
                    <strong>{lot.code}</strong>
                    <small>
                      {ageText(lot.age_days)} · {stageLabel(lot.stage)}
                    </small>
                  </div>
                  <Pill label={status.label} tone={status.tone} />
                  <div className="gp-row__cycle">
                    <strong>
                      {lot.live_count} <span>de {lot.received}</span>
                    </strong>
                    <BalanceBar alive={lot.live_count} received={lot.received} />
                    <small>{sobrevive}% vivo</small>
                  </div>
                  <div className="gp-row__actions">
                    <button
                      type="button"
                      className="btn-primary gp-btn--row"
                      onClick={() => onOpenLot(lot.id)}
                    >
                      Abrir
                    </button>
                    {canWrite ? (
                      <>
                        <ActionBtn
                          label="Editar"
                          onClick={() => {
                            setError("");
                            setEditing(lot);
                          }}
                        >
                          <IconPencil />
                        </ActionBtn>
                        <ActionBtn
                          label={lot.status === "cerrado" ? "Reabrir" : "Cerrar"}
                          onClick={() => {
                            setError("");
                            setClosing(lot);
                          }}
                        >
                          {lot.status === "cerrado" ? <IconUnlock /> : <IconLock />}
                        </ActionBtn>
                        <ActionBtn label="Eliminar" danger onClick={() => setRemoving(lot)}>
                          <IconTrash />
                        </ActionBtn>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GalponCard>

      {creating || editing ? (
        <LotForm
          houses={[house]}
          lot={editing}
          defaultHouseId={String(house.id)}
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

      {closing ? (
        <FormWindow
          title={
            closing.status === "cerrado"
              ? `Reabrir lote ${closing.code}`
              : `Cerrar lote ${closing.code}`
          }
          onClose={() => {
            setClosing(null);
            setCloseNote("");
          }}
        >
          <div className="gp-form gp-form--window">
            {closing.status === "cerrado" ? (
              <p className="gp-form__intro">
                El lote vuelve a quedar abierto y el galpón vuelve a estar ocupado. Puedes
                seguir anotando en su bitácora.
              </p>
            ) : (
              <>
                <p className="gp-form__intro">
                  Al cerrar, el galpón queda disponible y el lote guarda su resumen. Después
                  puedes crear otro lote en este mismo galpón.
                </p>
                <Field label="Nota de cierre" hint="Opcional">
                  <textarea
                    value={closeNote}
                    onChange={(event) => setCloseNote(event.target.value)}
                    rows={3}
                  />
                </Field>
              </>
            )}
            <div className="gp-form__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setClosing(null);
                  setCloseNote("");
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() =>
                  closing.status === "cerrado" ? void reopen(closing) : void finish()
                }
              >
                {saving
                  ? "Guardando..."
                  : closing.status === "cerrado"
                    ? "Reabrir lote"
                    : "Cerrar lote"}
              </button>
            </div>
          </div>
        </FormWindow>
      ) : null}

      {removing ? (
        <ConfirmModal
          text={`¿Eliminar el lote ${removing.code}? Se borra también su bitácora y no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          closeLabel="No, volver"
          onConfirm={() => void remove()}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </>
  );
}

function newPayload(draft: LotDraft): Record<string, unknown> {
  return {
    house_id: Number(draft.house_id),
    code: draft.code.trim(),
    arrived_at: draft.arrived_at,
    received: Number(draft.received),
    dead_on_arrival: Number(draft.dead_on_arrival || 0),
    discarded_on_arrival: Number(draft.discarded_on_arrival || 0),
    supplier: draft.supplier.trim(),
    documents: draft.documents.trim(),
    initial_age_days: Number(draft.initial_age_days || 0),
    initial_weight: draft.initial_weight || null,
    stage: draft.stage,
    levante_on: draft.levante_on || null,
    engorde_on: draft.engorde_on || null,
    feed_type: draft.feed_type.trim(),
    reception_notes: draft.reception_notes.trim(),
    receiver_name: draft.receiver_name.trim(),
  };
}

function editablePayload(draft: LotDraft): Record<string, unknown> {
  return {
    code: draft.code.trim(),
    arrived_at: draft.arrived_at,
    supplier: draft.supplier.trim(),
    documents: draft.documents.trim(),
    initial_age_days: Number(draft.initial_age_days || 0),
    initial_weight: draft.initial_weight || null,
    stage: draft.stage,
    levante_on: draft.levante_on || null,
    engorde_on: draft.engorde_on || null,
    feed_type: draft.feed_type.trim(),
    reception_notes: draft.reception_notes.trim(),
    receiver_name: draft.receiver_name.trim(),
  };
}

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

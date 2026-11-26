/**
 * Pantalla de un lote.
 *
 * Propósito: anotar la bitácora del lote. Los datos e indicadores quedan
 * detrás de un botón, para no saturar la pantalla.
 * Contexto: el lote vive dentro de un galpón y solo se anota mientras está
 * abierto.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { CharLeft, clip } from "../../../components/ui/CharLeft.tsx";
import { OBSERVATION_MAX } from "../limits.ts";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { closeLot, deleteLot, reopenLot, updateLot } from "../services/galponApi.ts";
import type { House, Lot, LotDraft } from "../types/index.ts";
import { BoardView } from "./BoardView.tsx";
import { LogView } from "./LogView.tsx";
import { LotForm } from "./LotForm.tsx";
import {
  ageText,
  dayText,
  ExtraBlock,
  Field,
  GalponCard,
  Guide,
  lotStatus,
  Note,
  numberText,
  Pill,
  stageLabel,
} from "./galponUi.tsx";

type Props = {
  farmId: number;
  house: House | null;
  lot: Lot;
  canWrite: boolean;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

const GUIDE = {
  title: "Cómo se usa un lote",
  lead: "Anota la bitácora aquí. Los datos e indicadores se abren solo si los pides.",
  steps: [
    "Registra cada ronda, muerte, peso, alimento o novedad en la bitácora.",
    "Si un registro quedó mal, usa Corregir: el valor anterior se conserva.",
    "Los datos del lote y sus indicadores están en Ver datos, por si los necesitas.",
    "Cuando salgan todas las aves, cierra el lote. Si te equivocaste, puedes reabrirlo.",
  ],
  example:
    "Llegaron 130 aves y mueren 3: la bitácora baja el saldo a 127. Al cerrar el lote se guarda el resumen y el galpón queda disponible.",
};

type Dato = { label: string; value: string };

/**
 * Página del lote con sus acciones.
 * @param props - Lote y manejadores.
 * @returns Bitácora al frente y datos opcionales plegados.
 */
export function LotWorkspace({
  farmId,
  house,
  lot,
  canWrite,
  onChanged,
  onDeleted,
  notify,
}: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const status = lotStatus(lot.status);
  const abierto = lot.status === "abierto";
  const occupiedByOther =
    !abierto && house?.open_lot_id != null && house.open_lot_id !== lot.id;
  const datos = datosRegistrados(lot, house);

  const save = async (draft: LotDraft) => {
    setSaving(true);
    setError("");
    try {
      await updateLot(farmId, lot.id, editablePayload(draft));
      notify(`Lote ${draft.code.trim()} actualizado.`);
      setEditing(false);
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
    setSaving(true);
    setError("");
    try {
      await deleteLot(farmId, lot.id);
      notify(`Lote ${lot.code} eliminado.`);
      setRemoving(false);
      await onDeleted();
    } catch (cause) {
      const text = message(cause, "No se pudo eliminar el lote");
      setError(text);
      notify(text, "warn");
      setRemoving(false);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      await closeLot(farmId, lot.id, closeNote);
      notify(`Lote ${lot.code} cerrado.`);
      setClosing(false);
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

  const reopen = async () => {
    setSaving(true);
    setError("");
    try {
      await reopenLot(farmId, lot.id);
      notify(`Lote ${lot.code} reabierto. Ya puedes seguir anotando.`);
      setClosing(false);
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
    <div className="gp-layout">
      <Guide title={GUIDE.title} lead={GUIDE.lead} steps={GUIDE.steps} example={GUIDE.example} />

      {error ? (
        <p className="galpon__error" role="alert">
          {error}
        </p>
      ) : null}

      {!abierto ? (
        <Note>
          {occupiedByOther
            ? "Este lote está cerrado. El galpón ya tiene un lote activo; ciérralo antes de reabrir este."
            : "Este lote está cerrado. Sus cifras y su bitácora se conservan; para anotar de nuevo, reábrelo."}
        </Note>
      ) : null}

      <ExtraBlock title="Datos e indicadores del lote">
        <article className="gp-house-head">
          <div className="gp-house-head__top">
            <div className="gp-house-head__main">
              <span className="gp-house__eyebrow">Lote</span>
              <h2>{lot.code}</h2>
              <p>
                {lot.house_name}
                {lot.supplier ? ` · ${lot.supplier}` : " · proveedor sin registrar"}
              </p>
            </div>

            {canWrite ? (
              <div className="gp-house-head__actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                  Editar lote
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (occupiedByOther) {
                      notify(
                        "Este galpón ya tiene un lote activo. Ciérralo antes de reabrir otro.",
                        "warn",
                      );
                      return;
                    }
                    setClosing(true);
                  }}
                >
                  {abierto ? "Cerrar lote" : "Reabrir lote"}
                </button>
                <button type="button" className="btn-danger" onClick={() => setRemoving(true)}>
                  Eliminar lote
                </button>
              </div>
            ) : null}
          </div>

          <div className="gp-house-head__facts">
            <div>
              <span>Estado</span>
              <Pill label={status.label} tone={status.tone} />
            </div>
            <div>
              <span>Aves vivas</span>
              <strong>
                {lot.live_count} de {lot.received}
              </strong>
            </div>
            <div>
              <span>Edad</span>
              <strong>{ageText(lot.age_days)}</strong>
            </div>
            <div>
              <span>Etapa</span>
              <strong>{stageLabel(lot.stage)}</strong>
            </div>
            <div>
              <span>Llegada</span>
              <strong>{dayText(lot.arrived_at)}</strong>
            </div>
          </div>
        </article>

        <div className="gp-house-grid gp-house-grid--fill">
          <BoardView lot={lot} />

          <GalponCard title="Datos del lote" subtitle="Recepción y datos registrados.">
            {datos.length ? (
              <dl className="gp-detail__facts">
                {datos.map((dato) => (
                  <div key={dato.label}>
                    <dt>{dato.label}</dt>
                    <dd>{dato.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="gp-detail__empty">
                Este lote todavía no tiene datos de recepción. Con Editar lote puedes agregarlos.
              </p>
            )}
          </GalponCard>
        </div>
      </ExtraBlock>

      <LogView
        farmId={farmId}
        lot={lot}
        canWrite={canWrite}
        onSaved={onChanged}
        notify={notify}
      />

      {editing ? (
        <LotForm
          houses={house ? [house] : []}
          lot={lot}
          defaultHouseId={String(lot.house_id)}
          saving={saving}
          error={error}
          onClose={() => {
            setEditing(false);
            setError("");
          }}
          onSave={(draft) => void save(draft)}
        />
      ) : null}

      {closing ? (
        <FormWindow
          title={abierto ? `Cerrar lote ${lot.code}` : `Reabrir lote ${lot.code}`}
          onClose={() => {
            setClosing(false);
            setCloseNote("");
          }}
        >
          <div className="gp-form gp-form--window">
            {abierto ? (
              <>
                <p className="gp-form__intro">
                  Al cerrar, el galpón queda disponible y el lote guarda su resumen. Después
                  puedes crear otro lote en este mismo galpón.
                </p>
                <Field label="Nota de cierre" hint="Opcional">
                  <textarea
                    value={closeNote}
                    maxLength={OBSERVATION_MAX}
                    onChange={(event) => setCloseNote(clip(event.target.value, OBSERVATION_MAX))}
                    rows={3}
                  />
                  <CharLeft value={closeNote} max={OBSERVATION_MAX} />
                </Field>
              </>
            ) : (
              <p className="gp-form__intro">
                El lote vuelve a quedar abierto y el galpón vuelve a estar ocupado. Puedes
                seguir anotando en su bitácora.
              </p>
            )}
            <div className="gp-form__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setClosing(false);
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
                onClick={() => (abierto ? void finish() : void reopen())}
              >
                {saving
                  ? "Guardando..."
                  : abierto
                    ? "Cerrar lote"
                    : "Reabrir lote"}
              </button>
            </div>
          </div>
        </FormWindow>
      ) : null}

      {removing ? (
        <ConfirmModal
          text={`¿Eliminar el lote ${lot.code}? Se borran también su bitácora y su saldo. Esto no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          closeLabel="No, volver"
          onConfirm={() => void remove()}
          onClose={() => setRemoving(false)}
        />
      ) : null}
    </div>
  );
}

function datosRegistrados(lot: Lot, house: House | null): Dato[] {
  const rows: (Dato | null)[] = [
    { label: "Código", value: lot.code },
    { label: "Galpón", value: lot.house_name },
    { label: "Llegada", value: dayText(lot.arrived_at) },
    { label: "Recibidas", value: `${lot.received} aves` },
    lot.dead_on_arrival ? { label: "Muertas al llegar", value: `${lot.dead_on_arrival} aves` } : null,
    { label: "Aves vivas", value: `${lot.live_count} aves` },
    { label: "Edad", value: ageText(lot.age_days) },
    { label: "Etapa", value: stageLabel(lot.stage) },
    lot.supplier ? { label: "Proveedor", value: lot.supplier } : null,
    lot.documents ? { label: "Documentos", value: lot.documents } : null,
    lot.initial_weight ? { label: "Peso inicial", value: `${numberText(lot.initial_weight)} kg` } : null,
    lot.feed_type ? { label: "Alimento", value: lot.feed_type } : null,
    lot.receiver_name ? { label: "Recibió", value: lot.receiver_name } : null,
    lot.levante_on ? { label: "Inicio de levante", value: dayText(lot.levante_on) } : null,
    lot.engorde_on ? { label: "Inicio de engorde", value: dayText(lot.engorde_on) } : null,
    house?.location ? { label: "Ubicación del galpón", value: house.location } : null,
  ];
  return rows.filter((row): row is Dato => row !== null);
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

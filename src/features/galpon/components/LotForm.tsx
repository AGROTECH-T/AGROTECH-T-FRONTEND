/**
 * Formulario de un lote de engorde.
 *
 * Propósito: registrar la llegada de las aves o corregir los datos de un
 * lote ya abierto, explicando en cada campo qué va y qué está mal.
 * Contexto: el número de aves recibidas solo se escribe al abrir el lote.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import type { House, Lot, LotDraft } from "../types/index.ts";
import { Field, NumberField, STAGES, plainNumber } from "./galponUi.tsx";

type Props = {
  houses: House[];
  lot: Lot | null;
  defaultHouseId?: string;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: LotDraft) => void;
};

type Gaps = Partial<Record<keyof LotDraft, string>>;

/** Campos que viven en la sección opcional del formulario. */
const OPTIONAL_KEYS: (keyof LotDraft)[] = [
  "supplier",
  "documents",
  "initial_age_days",
  "initial_weight",
  "feed_type",
  "stage",
  "levante_on",
  "engorde_on",
  "reception_notes",
];

/**
 * Fecha y hora actual en el formato que pide el navegador.
 * @returns Texto listo para un campo datetime-local.
 */
function nowLocalInput(): string {
  const now = new Date();
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}

function blankLot(houseId = ""): LotDraft {
  return {
    house_id: houseId,
    code: "",
    arrived_at: nowLocalInput(),
    received: "",
    dead_on_arrival: "0",
    discarded_on_arrival: "0",
    supplier: "",
    documents: "",
    initial_age_days: "0",
    initial_weight: "",
    stage: "inicio",
    levante_on: "",
    engorde_on: "",
    feed_type: "",
    reception_notes: "",
    receiver_name: "",
  };
}

function lotToDraft(lot: Lot): LotDraft {
  return {
    house_id: String(lot.house_id),
    code: lot.code,
    arrived_at: toLocalInput(lot.arrived_at),
    received: String(lot.received),
    dead_on_arrival: String(lot.dead_on_arrival),
    discarded_on_arrival: String(lot.discarded_on_arrival),
    supplier: lot.supplier,
    documents: lot.documents,
    initial_age_days: String(lot.initial_age_days),
    initial_weight: plainNumber(lot.initial_weight),
    stage: lot.stage,
    levante_on: lot.levante_on ?? "",
    engorde_on: lot.engorde_on ?? "",
    feed_type: lot.feed_type,
    reception_notes: lot.reception_notes,
    receiver_name: lot.receiver_name,
  };
}

/**
 * Convierte una fecha del backend al formato que pide el navegador.
 * @param value - Fecha ISO del backend.
 * @returns Fecha local en formato de formulario.
 */
function toLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/**
 * Indica si el lote ya trae algún dato de la sección opcional.
 * @param draft - Datos del lote en el formulario.
 * @returns Verdadero si hay algo escrito fuera de la recepción.
 */
function hasOptionalDetails(draft: LotDraft): boolean {
  if (draft.supplier.trim() || draft.documents.trim() || draft.feed_type.trim()) return true;
  if (draft.initial_weight.trim() || draft.reception_notes.trim()) return true;
  if (draft.levante_on || draft.engorde_on) return true;
  if (draft.stage && draft.stage !== "inicio") return true;
  if (draft.initial_age_days && draft.initial_age_days !== "0") return true;
  return false;
}

/**
 * Ventana para abrir o corregir un lote.
 * @param props - Finca, galpones, lote (o null) y acciones.
 * @returns Formulario en ventana.
 */
export function LotForm({
  houses,
  lot,
  defaultHouseId,
  saving,
  error = "",
  onClose,
  onSave,
}: Readonly<Props>) {
  const [draft, setDraft] = useState<LotDraft>(() =>
    lot ? lotToDraft(lot) : blankLot(defaultHouseId),
  );
  const [gaps, setGaps] = useState<Gaps>({});
  const [showMore, setShowMore] = useState(() =>
    lot ? hasOptionalDetails(lotToDraft(lot)) : false,
  );
  const editing = lot !== null;

  const edit = (key: keyof LotDraft) => (event: { target: { value: string } }) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setGaps((current) => ({ ...current, [key]: undefined }));
  };

  const change = (key: keyof LotDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setGaps((current) => ({ ...current, [key]: undefined }));
  };

  function submit() {
    const found = review(draft, editing);
    setGaps(found);
    if (Object.keys(found).length === 0) {
      onSave(draft);
      return;
    }
    if (OPTIONAL_KEYS.some((key) => found[key])) setShowMore(true);
  }

  const pending = Object.values(gaps).filter(Boolean).length;
  const disponibles = houses.filter(
    (house) => lot == null || house.id === lot.house_id,
  );

  return (
    <FormWindow title={editing ? `Editar lote ${lot.code}` : "Crear lote"} onClose={onClose} wide>
      <form
        className="gp-form gp-form--window"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="gp-form__intro">
          {editing
            ? "Corrige los datos de la recepción. El número de aves ya recibidas no se cambia; para eso usa un ajuste en la bitácora."
            : "Registra la llegada tal como ocurrió. La fecha y hora ya traen el momento actual; solo cámbialas si llegaron antes."}
        </p>

        {pending > 0 ? (
          <p className="gp-form__summary" role="alert">
            Revisa {pending === 1 ? "este campo" : `estos ${pending} campos`} marcado
            {pending === 1 ? "" : "s"} en rojo antes de guardar.
          </p>
        ) : null}

        <fieldset className="gp-form__group">
          <legend>Recepción</legend>
          <div className="gp-form__grid">
            <Field label="Galpón" error={gaps.house_id} required={!editing}>
              <select
                value={draft.house_id}
                onChange={edit("house_id")}
                disabled={editing}
              >
                <option value="">Elige un galpón</option>
                {disponibles.map((house) => (
                  <option key={house.id} value={house.id}>
                    {house.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Código del lote" error={gaps.code} required>
              <input
                value={draft.code}
                onChange={edit("code")}
                placeholder="L-2026-01"
                maxLength={40}
              />
            </Field>
            <Field label="Llegada" error={gaps.arrived_at} required>
              <input
                type="datetime-local"
                value={draft.arrived_at}
                onChange={edit("arrived_at")}
              />
            </Field>
            <NumberField
              label="Aves recibidas"
              integer
              value={draft.received}
              onChange={change("received")}
              placeholder="Ej. 130"
              disabled={editing}
              error={gaps.received}
              required={!editing}
            />
            <NumberField
              label="Muertas al llegar"
              integer
              value={draft.dead_on_arrival}
              onChange={change("dead_on_arrival")}
              placeholder="0"
              disabled={editing}
              error={gaps.dead_on_arrival}
            />
            <Field label="Quién recibió" error={gaps.receiver_name} required>
              <input
                value={draft.receiver_name}
                onChange={edit("receiver_name")}
                placeholder="Nombre de quien recibió"
                maxLength={80}
              />
            </Field>
          </div>
        </fieldset>

        <button
          type="button"
          className="gp-form__toggle"
          aria-expanded={showMore}
          onClick={() => setShowMore((current) => !current)}
        >
          {showMore
            ? "Ocultar datos opcionales"
            : "Agregar origen, etapas y observaciones (opcional)"}
        </button>

        {showMore ? (
          <>
            <fieldset className="gp-form__group">
              <legend>Origen</legend>
              <div className="gp-form__grid">
                <Field label="Proveedor">
                  <input
                    value={draft.supplier}
                    onChange={edit("supplier")}
                    placeholder="Quién trajo las aves"
                    maxLength={120}
                  />
                </Field>
                <Field label="Documentos">
                  <input
                    value={draft.documents}
                    onChange={edit("documents")}
                    placeholder="Factura o guía"
                    maxLength={200}
                  />
                </Field>
                <NumberField
                  label="Edad inicial (días)"
                  integer
                  value={draft.initial_age_days}
                  onChange={change("initial_age_days")}
                  placeholder="Ej. 1"
                  error={gaps.initial_age_days}
                />
                <NumberField
                  label="Peso inicial (kg)"
                  value={draft.initial_weight}
                  onChange={change("initial_weight")}
                  placeholder="Ej. 0.045"
                  error={gaps.initial_weight}
                />
                <Field label="Alimento inicial">
                  <input
                    value={draft.feed_type}
                    onChange={edit("feed_type")}
                    placeholder="Iniciador"
                    maxLength={80}
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="gp-form__group">
              <legend>Etapas</legend>
              <div className="gp-form__grid">
                <Field label="Etapa inicial">
                  <select value={draft.stage} onChange={edit("stage")}>
                    {STAGES.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pasa a levante">
                  <input type="date" value={draft.levante_on} onChange={edit("levante_on")} />
                </Field>
                <Field label="Pasa a engorde">
                  <input type="date" value={draft.engorde_on} onChange={edit("engorde_on")} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="gp-form__group">
              <legend>Observaciones</legend>
              <div className="gp-form__grid">
                <Field label="Cómo llegaron" span>
                  <textarea
                    value={draft.reception_notes}
                    onChange={edit("reception_notes")}
                    rows={3}
                  />
                </Field>
              </div>
            </fieldset>
          </>
        ) : null}

        {error ? (
          <p className="gp-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="gp-form__actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear lote"}
          </button>
        </div>
      </form>
    </FormWindow>
  );
}

/**
 * Revisa el borrador y dice qué campo está mal.
 * @param draft - Lo que escribió la persona.
 * @param editing - Si el lote ya existe.
 * @returns Mensaje por campo con problema; vacío si todo está bien.
 */
export function review(draft: LotDraft, editing: boolean): Gaps {
  const gaps: Gaps = {};

  if (!editing) {
    if (!draft.house_id) gaps.house_id = "Elige en qué galpón entran las aves.";
    if (!draft.received.trim()) {
      gaps.received = "Escribe cuántas aves llegaron.";
    }
  }

  if (!draft.code.trim()) {
    gaps.code = "Ponle un código al lote, por ejemplo “L-2026-01”.";
  }
  if (!draft.arrived_at) {
    gaps.arrived_at = "Escribe la fecha y hora de la llegada.";
  }
  if (!draft.receiver_name.trim()) {
    gaps.receiver_name = "Escribe quién recibió las aves.";
  }

  const counts: [keyof LotDraft, string][] = [
    ["received", "Las aves recibidas"],
    ["dead_on_arrival", "Las muertas al llegar"],
    ["initial_age_days", "La edad inicial"],
  ];
  for (const [key, label] of counts) {
    const value = String(draft[key] ?? "").trim();
    if (!value) continue;
    if (!/^\d+$/.test(value)) {
      gaps[key] = `${label} debe ser un número entero, sin decimales.`;
    } else if (key === "received" && Number(value) <= 0) {
      gaps[key] = "Las aves recibidas deben ser más de cero.";
    }
  }

  const weight = draft.initial_weight.trim();
  if (weight) {
    if (!/^\d+(\.\d+)?$/.test(weight)) {
      gaps.initial_weight = "El peso inicial debe ser un número. Ej. 0.045";
    } else if (Number(weight) <= 0) {
      gaps.initial_weight = "El peso inicial debe ser mayor que cero.";
    }
  }

  if (!editing) {
    const muertas = Number(draft.dead_on_arrival || 0);
    const recibidas = Number(draft.received || 0);
    if (Number.isFinite(muertas) && Number.isFinite(recibidas) && muertas > recibidas) {
      gaps.dead_on_arrival = "Las muertas al llegar no pueden ser más que las aves recibidas.";
    }
  }
  return gaps;
}

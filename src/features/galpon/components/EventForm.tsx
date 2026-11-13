/**
 * Formulario de un registro de bitácora.
 *
 * Propósito: anotar lo que se vio o se hizo en el lote, o corregir un
 * registro que quedó mal.
 * Contexto: cada tipo pide solo lo que necesita; la unidad se deduce del tipo.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import type { LotEvent } from "../types/index.ts";
import { EVENT_KINDS, Field, kindHint, NumberField, STAGES, plainNumber } from "./galponUi.tsx";

type Props = {
  event: LotEvent | null;
  initialKind?: string;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
};

type Gaps = Partial<Record<string, string>>;

const COUNT_KINDS = ["mortalidad", "aislamiento", "salida", "ajuste"];
const MEASURED_KINDS = [...COUNT_KINDS, "peso", "agua", "ambiente", "alimento"];

const UNIT_BY_KIND: Record<string, string> = {
  mortalidad: "aves",
  aislamiento: "aves",
  salida: "aves",
  ajuste: "aves",
  peso: "kg",
  agua: "L",
  ambiente: "°C",
};

const UNITS = ["aves", "kg", "bulto", "caneca", "L", "°C"];

const VALUE_WORDS: Record<string, string> = {
  mortalidad: "Escribe cuántas aves murieron.",
  aislamiento: "Escribe cuántas aves se aislaron.",
  salida: "Escribe cuántas aves salieron del lote.",
  ajuste: "Escribe cuántas aves se ajustan.",
  peso: "Escribe el peso observado.",
  agua: "Escribe cuánta agua se registró.",
  ambiente: "Escribe la temperatura observada.",
  alimento: "Escribe cuánto alimento se entregó.",
};

export type Draft = {
  kind: string;
  occurred_at: string;
  responsible: string;
  observed_value: string;
  unit: string;
  place: string;
  notes: string;
  stage: string;
  direction: string;
  product: string;
  prescriptor: string;
  estimated: boolean;
  confirmed: boolean;
};

function defaultUnit(kind: string): string {
  return UNIT_BY_KIND[kind] ?? "bulto";
}

function blankDraft(kind: string): Draft {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    kind,
    occurred_at: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
      now.getHours(),
    )}:${pad(now.getMinutes())}`,
    responsible: "",
    observed_value: "",
    unit: defaultUnit(kind),
    place: "",
    notes: "",
    stage: "inicio",
    direction: kind === "aislamiento" ? "apartar" : "sumar",
    product: "",
    prescriptor: "",
    estimated: false,
    confirmed: false,
  };
}

function eventToDraft(event: LotEvent): Draft {
  const date = new Date(event.occurred_at);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    kind: event.kind,
    occurred_at: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`,
    responsible: event.responsible,
    observed_value: eventValue(event),
    unit: event.unit || defaultUnit(event.kind),
    place: event.place,
    notes: event.notes,
    stage: String(event.payload.etapa ?? "inicio"),
    direction: String(
      event.payload.direccion ?? (event.kind === "aislamiento" ? "apartar" : "sumar"),
    ),
    product: String(event.payload.producto ?? ""),
    prescriptor: String(event.payload.prescriptor ?? ""),
    estimated: event.estimated,
    confirmed: event.confirmed,
  };
}

/**
 * Escribe la cantidad como la persona la vería.
 * @param event - Registro guardado.
 * @returns Cantidad sin ceros sobrantes.
 */
function eventValue(event: LotEvent): string {
  return plainNumber(event.observed_value);
}

/**
 * Ventana para registrar o corregir un hecho del lote.
 * @param props - Registro a corregir (o null), tipo inicial y acciones.
 * @returns Formulario en ventana.
 */
export function EventForm({
  event,
  initialKind = "ronda",
  saving,
  error = "",
  onClose,
  onSave,
}: Readonly<Props>) {
  const [draft, setDraft] = useState<Draft>(() =>
    event ? eventToDraft(event) : blankDraft(initialKind),
  );
  const [gaps, setGaps] = useState<Gaps>({});
  const editing = event !== null;

  const edit = (key: keyof Draft) => (input: { target: { value: string } }) => {
    setDraft((current) => ({ ...current, [key]: input.target.value }));
    setGaps((current) => omitGap(current, key));
  };

  const change = (key: keyof Draft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setGaps((current) => omitGap(current, key));
  };

  const flip = (key: "estimated" | "confirmed") => (input: { target: { checked: boolean } }) => {
    setDraft((current) => ({ ...current, [key]: input.target.checked }));
  };

  const changeKind = (value: string) => {
    setDraft((current) => ({
      ...current,
      kind: value,
      unit: defaultUnit(value),
      direction: value === "aislamiento" ? "apartar" : "sumar",
    }));
    setGaps({});
  };

  const pideCantidad = COUNT_KINDS.includes(draft.kind);
  const storedValue = editing && event?.observed_value != null;
  const pideValor = MEASURED_KINDS.includes(draft.kind) || storedValue;
  const unidadFija = UNIT_BY_KIND[draft.kind] && !(storedValue && !MEASURED_KINDS.includes(draft.kind));

  function submit() {
    const found = review(draft);
    setGaps(found);
    if (Object.keys(found).length > 0) return;
    const payload: Record<string, unknown> = {
      kind: draft.kind,
      occurred_at: draft.occurred_at,
      responsible: draft.responsible.trim(),
      observed_value: draft.observed_value.trim() || null,
      unit: draft.unit.trim(),
      place: draft.place.trim(),
      notes: draft.notes.trim(),
      estimated: draft.estimated,
      confirmed: draft.confirmed,
      payload: {},
    };
    if (draft.kind === "alimento") payload.payload = { etapa: draft.stage };
    if (draft.kind === "peso") payload.payload = { muestra: true };
    if (draft.kind === "ambiente") payload.payload = { amoniaco_medido: draft.confirmed };
    if (draft.kind === "ajuste" || draft.kind === "aislamiento") {
      payload.payload = { direccion: draft.direction };
    }
    if (draft.kind === "sanidad") {
      payload.payload = { producto: draft.product.trim(), prescriptor: draft.prescriptor.trim() };
    }
    if (editing) payload.reason = "Corrección desde la bitácora";
    onSave(payload);
  }

  const pending = missCount(gaps);

  return (
    <FormWindow title={editing ? "Corregir registro" : "Crear registro"} onClose={onClose} wide>
      <form
        className="gp-form gp-form--window"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          submit();
        }}
      >
        <p className="gp-form__intro">{kindHint(draft.kind)}</p>

        {pending > 0 ? (
          <p className="gp-form__summary" role="alert">
            Revisa {pending === 1 ? "este campo" : `estos ${pending} campos`} marcado
            {pending === 1 ? "" : "s"} en rojo antes de guardar.
          </p>
        ) : null}

        <fieldset className="gp-form__group">
          <legend>Qué pasó</legend>
          <div className="gp-form__grid">
            <Field label="Tipo de registro">
              <select
                value={draft.kind}
                onChange={(input) => changeKind(input.target.value)}
                disabled={editing}
              >
                {EVENT_KINDS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha y hora" error={gaps.occurred_at} required>
              <input
                type="datetime-local"
                value={draft.occurred_at}
                onChange={edit("occurred_at")}
              />
            </Field>
            <Field label="Responsable" error={gaps.responsible} required>
              <input
                value={draft.responsible}
                onChange={edit("responsible")}
                placeholder="Nombre de quien anota"
                maxLength={80}
              />
            </Field>
            {pideValor ? (
              <NumberField
                label={
                  draft.kind === "aislamiento" && draft.direction === "devolver"
                    ? "Cuántas aves vuelven"
                    : pideCantidad
                      ? "Cuántas aves"
                      : `Cantidad${unidadFija ? ` (${draft.unit})` : ""}`
                }
                integer={pideCantidad}
                value={draft.observed_value}
                onChange={change("observed_value")}
                placeholder={pideCantidad ? "Ej. 3" : "Ej. 25"}
                error={gaps.observed_value}
                required={pideValor}
              />
            ) : null}
            {pideValor && !unidadFija ? (
              <Field label="Unidad">
                <select value={draft.unit} onChange={edit("unit")}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Lugar">
              <input
                value={draft.place}
                onChange={edit("place")}
                placeholder="Ej. Lado norte"
                maxLength={80}
              />
            </Field>
          </div>
        </fieldset>

        {draft.kind === "alimento" ? (
          <fieldset className="gp-form__group">
            <legend>Alimento</legend>
            <div className="gp-form__grid">
              <Field label="Etapa del alimento">
                <select value={draft.stage} onChange={edit("stage")}>
                  {STAGES.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>
        ) : null}

        {draft.kind === "aislamiento" ? (
          <fieldset className="gp-form__group">
            <legend>Aislamiento</legend>
            <div className="gp-form__grid">
              <Field label="Qué se hace" required>
                <select value={draft.direction} onChange={edit("direction")}>
                  <option value="apartar">Apartar del espacio normal</option>
                  <option value="devolver">Devolver al espacio normal</option>
                </select>
              </Field>
            </div>
          </fieldset>
        ) : null}

        {draft.kind === "ajuste" ? (
          <fieldset className="gp-form__group">
            <legend>Ajuste de saldo</legend>
            <div className="gp-form__grid">
              <Field label="Dirección del ajuste">
                <select value={draft.direction} onChange={edit("direction")}>
                  <option value="sumar">Sumar aves</option>
                  <option value="restar">Restar aves</option>
                </select>
              </Field>
            </div>
          </fieldset>
        ) : null}

        {draft.kind === "sanidad" ? (
          <fieldset className="gp-form__group">
            <legend>Sanidad</legend>
            <div className="gp-form__grid">
              <Field label="Producto o insumo">
                <input
                  value={draft.product}
                  onChange={edit("product")}
                  placeholder="Nombre del producto"
                  maxLength={80}
                />
              </Field>
              <Field label="Quién lo indicó" error={gaps.prescriptor}>
                <input
                  value={draft.prescriptor}
                  onChange={edit("prescriptor")}
                  placeholder="Nombre del veterinario"
                  maxLength={80}
                />
              </Field>
            </div>
          </fieldset>
        ) : null}

        <fieldset className="gp-form__group">
          <legend>Detalle</legend>
          <div className="gp-form__grid">
            <Field
              label="Qué se vio y qué se hizo"
              span
              error={gaps.notes}
              required={draft.kind === "ajuste"}
            >
              <textarea value={draft.notes} onChange={edit("notes")} rows={3} />
            </Field>
          </div>
        </fieldset>

        {pideValor || draft.kind === "sanidad" ? (
          <div className="gp-form__checks">
            {pideValor ? (
              <label className="gp-check">
                <input
                  type="checkbox"
                  checked={draft.estimated}
                  onChange={flip("estimated")}
                />
                <span>La cantidad es estimada</span>
              </label>
            ) : null}
            <label className="gp-check">
              <input
                type="checkbox"
                checked={draft.confirmed}
                onChange={flip("confirmed")}
              />
              <span>El dato está confirmado</span>
            </label>
          </div>
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
            {saving ? "Guardando..." : editing ? "Guardar corrección" : "Crear registro"}
          </button>
        </div>
      </form>
    </FormWindow>
  );
}

/**
 * Revisa el borrador y dice qué campo está mal.
 * @param draft - Lo que escribió la persona.
 * @returns Mensaje por campo con problema; vacío si todo está bien.
 */
export function review(draft: Draft): Gaps {
  const gaps: Gaps = {};
  if (!draft.occurred_at) {
    gaps.occurred_at = "Escribe la fecha y hora del registro.";
  }
  if (!draft.responsible.trim()) {
    gaps.responsible = "Escribe quién anota este registro.";
  }
  const value = draft.observed_value.trim();
  if (MEASURED_KINDS.includes(draft.kind)) {
    if (!value) {
      gaps.observed_value =
        VALUE_WORDS[draft.kind] ?? "Escribe la cantidad de este registro.";
    } else if (COUNT_KINDS.includes(draft.kind) && !/^\d+$/.test(value)) {
      gaps.observed_value = "Aquí van aves enteras, sin decimales. Ej. 3";
    } else if (!COUNT_KINDS.includes(draft.kind) && !/^\d+(\.\d+)?$/.test(value)) {
      gaps.observed_value = "Aquí solo van números. Ej. 25 o 1.5";
    } else if (Number(value) <= 0) {
      gaps.observed_value = "La cantidad debe ser mayor que cero.";
    }
  } else if (value && !/^\d+(\.\d+)?$/.test(value)) {
    gaps.observed_value = "Aquí solo van números. Ej. 25 o 1.5";
  }
  if (draft.kind === "ajuste" && !draft.notes.trim()) {
    gaps.notes = "El ajuste necesita una nota que lo justifique.";
  }
  if (draft.kind === "sanidad" && draft.confirmed && !draft.prescriptor.trim()) {
    gaps.prescriptor = "Un dato confirmado de sanidad necesita quién lo indicó.";
  }
  return gaps;
}

/**
 * Quita el aviso de un campo que la persona ya está corrigiendo.
 * @param gaps - Avisos actuales.
 * @param key - Campo que dejó de estar pendiente.
 * @returns Avisos sin ese campo.
 */
function omitGap(gaps: Gaps, key: string): Gaps {
  const next = { ...gaps };
  delete next[key];
  return next;
}

/**
 * Cuenta solo avisos con texto, no claves vacías.
 * @param gaps - Avisos actuales.
 * @returns Cantidad de campos pendientes.
 */
function missCount(gaps: Gaps): number {
  return Object.values(gaps).filter(Boolean).length;
}

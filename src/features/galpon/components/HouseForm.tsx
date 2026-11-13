/**
 * Formulario de un galpón.
 *
 * Propósito: crear o editar el galpón con pocos campos, explicando en cada
 * campo qué va y qué está mal.
 * Contexto: solo el nombre es obligatorio; lo demás se completa cuando se sepa.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import type { House, HouseDraft } from "../types/index.ts";
import { Field, FEED_MODES, NumberField, plainNumber } from "./galponUi.tsx";

type Props = {
  house: House | null;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: HouseDraft) => void;
};

type Gaps = Partial<Record<keyof HouseDraft, string>>;

/**
 * Galpón vacío para el alta.
 * @returns Borrador sin datos.
 */
export function blankHouse(): HouseDraft {
  return {
    name: "",
    location: "",
    length_m: "",
    width_m: "",
    capacity: "",
    usual_birds: "",
    bale_kg: "",
    bales_per_drum: "",
    feed_mode: "",
    cycle_days: "",
    status: "disponible",
  };
}

/**
 * Pasa un galpón guardado al formulario.
 * @param house - Galpón con los datos actuales.
 * @returns Borrador con los valores escritos como texto.
 */
export function draftFrom(house: House): HouseDraft {
  return {
    name: house.name,
    location: house.location,
    length_m: plainNumber(house.length_m),
    width_m: plainNumber(house.width_m),
    capacity: house.capacity == null ? "" : String(house.capacity),
    usual_birds: house.usual_birds == null ? "" : String(house.usual_birds),
    bale_kg: plainNumber(house.bale_kg),
    bales_per_drum: plainNumber(house.bales_per_drum),
    feed_mode: house.feed_mode,
    cycle_days: house.cycle_days == null ? "" : String(house.cycle_days),
    status: house.status,
  };
}

/**
 * Ventana para crear o editar un galpón.
 * @param props - Galpón a editar (o null), estado del guardado y acciones.
 * @returns Formulario en ventana.
 */
export function HouseForm({ house, saving, error = "", onClose, onSave }: Readonly<Props>) {
  const [draft, setDraft] = useState<HouseDraft>(() =>
    house ? draftFrom(house) : blankHouse(),
  );
  const [gaps, setGaps] = useState<Gaps>({});
  const [showMore, setShowMore] = useState(() => Boolean(house && hasDetails(house)));

  const edit = (key: keyof HouseDraft) => (event: { target: { value: string } }) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setGaps((current) => ({ ...current, [key]: undefined }));
  };

  const change = (key: keyof HouseDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setGaps((current) => ({ ...current, [key]: undefined }));
  };

  function submit() {
    const found = review(draft);
    setGaps(found);
    if (Object.keys(found).length > 0) return;
    onSave(draft);
  }

  const pending = Object.values(gaps).filter(Boolean).length;

  return (
    <FormWindow title={house ? "Editar galpón" : "Crear galpón"} onClose={onClose} wide>
      <form
        className="gp-form gp-form--window"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="gp-form__intro">
          Solo el nombre es obligatorio. Lo demás lo puedes llenar cuando lo sepas.
        </p>

        {pending > 0 ? (
          <p className="gp-form__summary" role="alert">
            Revisa {pending === 1 ? "este campo" : `estos ${pending} campos`} marcado
            {pending === 1 ? "" : "s"} en rojo antes de guardar.
          </p>
        ) : null}

        <fieldset className="gp-form__group">
          <legend>Datos básicos</legend>
          <div className="gp-form__grid">
            <Field label="Nombre del galpón" error={gaps.name} required>
              <input
                value={draft.name}
                onChange={edit("name")}
                placeholder="Galpón 1"
                maxLength={80}
                autoFocus
              />
            </Field>
            <Field label="Ubicación" error={gaps.location}>
              <input
                value={draft.location}
                onChange={edit("location")}
                placeholder="Zona alta, opcional"
                maxLength={120}
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
          {showMore ? "Ocultar medidas y alimento" : "Agregar medidas y alimento (opcional)"}
        </button>

        {showMore ? (
          <>
            <fieldset className="gp-form__group">
              <legend>Medidas</legend>
              <div className="gp-form__grid">
                <NumberField
                  label="Largo (m)"
                  value={draft.length_m}
                  onChange={change("length_m")}
                  placeholder="Ej. 7"
                  error={gaps.length_m}
                />
                <NumberField
                  label="Ancho (m)"
                  value={draft.width_m}
                  onChange={change("width_m")}
                  placeholder="Ej. 3"
                  error={gaps.width_m}
                />
                <NumberField
                  label="Capacidad (aves)"
                  integer
                  value={draft.capacity}
                  onChange={change("capacity")}
                  placeholder="Ej. 150"
                  error={gaps.capacity}
                />
                <NumberField
                  label="Aforo habitual"
                  integer
                  value={draft.usual_birds}
                  onChange={change("usual_birds")}
                  placeholder="Ej. 130"
                  error={gaps.usual_birds}
                />
                <NumberField
                  label="Días del lote"
                  integer
                  value={draft.cycle_days}
                  onChange={change("cycle_days")}
                  placeholder="Ej. 45"
                  error={gaps.cycle_days}
                />
              </div>
            </fieldset>

            <fieldset className="gp-form__group">
              <legend>Alimento</legend>
              <div className="gp-form__grid">
                <NumberField
                  label="Bulto (kg)"
                  value={draft.bale_kg}
                  onChange={change("bale_kg")}
                  placeholder="Ej. 25"
                  error={gaps.bale_kg}
                />
                <NumberField
                  label="Bultos por caneca"
                  value={draft.bales_per_drum}
                  onChange={change("bales_per_drum")}
                  placeholder="Ej. 2"
                  error={gaps.bales_per_drum}
                />
                <Field label="Forma de suministro">
                  <select value={draft.feed_mode} onChange={edit("feed_mode")}>
                    <option value="">Sin definir</option>
                    {FEED_MODES.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
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
            {saving ? "Guardando..." : house ? "Guardar galpón" : "Crear galpón"}
          </button>
        </div>
      </form>
    </FormWindow>
  );
}

function hasDetails(house: House): boolean {
  return Boolean(
    house.length_m ||
      house.width_m ||
      house.capacity ||
      house.usual_birds ||
      house.bale_kg ||
      house.bales_per_drum ||
      house.feed_mode ||
      house.cycle_days,
  );
}

/**
 * Revisa el borrador y dice qué campo está mal.
 * @param draft - Lo que escribió la persona.
 * @returns Mensaje por campo con problema; vacío si todo está bien.
 */
export function review(draft: HouseDraft): Gaps {
  const gaps: Gaps = {};
  if (!draft.name.trim()) {
    gaps.name = "Ponle un nombre al galpón, por ejemplo “Galpón 1”.";
  } else if (draft.name.trim().length > 80) {
    gaps.name = "El nombre no puede pasar de 80 caracteres.";
  }
  if (draft.location.trim().length > 120) {
    gaps.location = "La ubicación no puede pasar de 120 caracteres.";
  }

  const decimals: [keyof HouseDraft, string][] = [
    ["length_m", "El largo"],
    ["width_m", "El ancho"],
    ["bale_kg", "El peso del bulto"],
    ["bales_per_drum", "Los bultos por caneca"],
  ];
  for (const [key, label] of decimals) {
    const value = String(draft[key] ?? "").trim();
    if (!value) continue;
    if (!/^\d+(\.\d+)?$/.test(value)) {
      gaps[key] = `${label} debe ser un número. Ej. 7`;
    } else if (Number(value) <= 0) {
      gaps[key] = `${label} debe ser mayor que cero.`;
    }
  }

  const counts: [keyof HouseDraft, string][] = [
    ["capacity", "La capacidad"],
    ["usual_birds", "El aforo habitual"],
    ["cycle_days", "Los días del lote"],
  ];
  for (const [key, label] of counts) {
    const value = String(draft[key] ?? "").trim();
    if (!value) continue;
    if (!/^\d+$/.test(value)) {
      gaps[key] = `${label} debe ser un número entero, sin decimales.`;
    } else if (Number(value) <= 0) {
      gaps[key] = `${label} debe ser mayor que cero.`;
    }
  }

  if (draft.length_m.trim() && !draft.width_m.trim()) {
    gaps.width_m = "Falta el ancho para poder calcular el área.";
  }
  if (draft.width_m.trim() && !draft.length_m.trim()) {
    gaps.length_m = "Falta el largo para poder calcular el área.";
  }
  return gaps;
}

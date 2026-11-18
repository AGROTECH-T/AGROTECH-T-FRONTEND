/**
 * Registro de entrada, salida o ajuste.
 *
 * Propósito: pedir la cantidad según la unidad y mostrar la equivalencia.
 * Contexto: Sacar todo y Mitad solo aplican a salidas.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type FormEvent } from "react";
import type { FarmRole } from "../../farms/types/index.ts";
import { createMovement, getProduct } from "../services/inventoryApi.ts";
import {
  displayQuantity,
  equivalenceText,
  halfStock,
  isWholeUnit,
} from "../services/equivalence.ts";
import type { MovementKind, Product } from "../types/index.ts";

type Props = {
  farmId: number;
  product: Product;
  role: FarmRole;
  lockedKind?: MovementKind;
  initialKind?: MovementKind;
  onDone: (product: Product) => void;
};

/**
 * Formulario de un movimiento sobre el insumo abierto.
 * @param props - Producto, rol y aviso al terminar.
 * @returns Formulario o aviso si el rol no puede mover stock.
 */
export function MovementForm({
  farmId,
  product,
  role,
  lockedKind,
  initialKind,
  onDone,
}: Readonly<Props>) {
  const canWrite = role === "administrador" || role === "operador";
  const canAdjust = role === "administrador" && !lockedKind;
  const whole = isWholeUnit(product.unit_nature);
  const [kind, setKind] = useState<MovementKind>(lockedKind ?? initialKind ?? "entrada");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [takeAll, setTakeAll] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [miss, setMiss] = useState<{ quantity: string; note: string }>({ quantity: "", note: "" });
  const stock = Number(product.quantity);
  const shown = takeAll ? displayQuantity(product.quantity, product.unit_nature) : quantity;
  const equivalent = equivalenceText(shown, product.unit_factor, product.base_symbol);
  const half = halfStock(product.quantity, product.unit_nature, product.unit_decimal_places);

  if (!canWrite) return null;

  if (!product.is_active) {
    return <p className="panel__lead">Producto inactivo: no admite movimientos.</p>;
  }

  const changeKind = (next: MovementKind) => {
    setKind(next);
    setTakeAll(false);
    setError("");
  };

  const fillAll = () => {
    setKind("salida");
    setTakeAll(true);
    setQuantity(displayQuantity(product.quantity, product.unit_nature));
    setNote((current) => (current.trim() ? current : "Salida total"));
  };

  const fillHalf = () => {
    if (!half) return;
    setKind("salida");
    setTakeAll(false);
    setQuantity(half);
  };

  const bump = (delta: number) => {
    setTakeAll(false);
    const current = Number(quantity || "0");
    const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
    setQuantity(String(next));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const message = review({
      kind,
      quantity: shown,
      note,
      takeAll,
      whole,
      decimals: product.unit_decimal_places,
    });
    if (message) {
      const onNote = message.toLowerCase().includes("nota");
      setMiss({ quantity: onNote ? "" : message, note: onNote ? "Escribe la nota." : "" });
      return;
    }
    setMiss({ quantity: "", note: "" });
    setPending(true);
    try {
      await createMovement(farmId, product.id, {
        kind,
        quantity: shown,
        note,
        takeAll,
        idempotencyKey: crypto.randomUUID(),
      });
      const fresh = await getProduct(farmId, product.id);
      onDone(fresh);
      setQuantity("");
      setNote("");
      setTakeAll(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el movimiento");
    } finally {
      setPending(false);
    }
  };

  const step = whole || product.unit_decimal_places === 0 ? "1" : decimalStep(product.unit_decimal_places);

  return (
    <form className="inv-form" onSubmit={(event) => void submit(event)} noValidate>
      <h3 className="inv-form__title">{titleFor(kind)}</h3>
      <p className="inv-equivalence">
        Disponible: {displayQuantity(product.quantity, product.unit_nature)} {product.unit_label}
      </p>
      {lockedKind ? null : (
        <label className="inv-form__field">
          <span>Tipo</span>
          <select
            value={kind}
            onChange={(event) => changeKind(event.target.value as MovementKind)}
            disabled={pending}
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            {canAdjust ? <option value="ajuste">Ajuste (cantidad contada)</option> : null}
          </select>
        </label>
      )}
      <label className={miss.quantity ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>{kind === "ajuste" ? "Cantidad contada" : "Cantidad"}</span>
        <span className={whole ? "inv-stepper" : "inv-stepper is-plain"}>
          {whole ? (
            <button type="button" onClick={() => bump(-1)} disabled={pending} aria-label="Restar uno">
              −
            </button>
          ) : null}
          <input
            type="number"
            inputMode="decimal"
            min={kind === "ajuste" ? "0" : step}
            step={step}
            value={shown}
            onChange={(event) => {
              setTakeAll(false);
              setQuantity(event.target.value);
              setMiss((current) => ({ ...current, quantity: "" }));
            }}
            disabled={pending}
          />
          {whole ? (
            <button type="button" onClick={() => bump(1)} disabled={pending} aria-label="Sumar uno">
              +
            </button>
          ) : null}
        </span>
        {miss.quantity ? <span className="field-miss">{miss.quantity}</span> : null}
      </label>
      {equivalent ? <p className="inv-equivalence">= {equivalent}</p> : null}
      {kind === "salida" || lockedKind === "salida" ? (
        <div className="inv-form__actions inv-form__actions--start">
          <button type="button" className="btn-secondary" onClick={fillAll} disabled={pending || stock <= 0}>
            Sacar todo
          </button>
          <button type="button" className="btn-secondary" onClick={fillHalf} disabled={pending || !half}>
            Mitad
          </button>
        </div>
      ) : null}
      <label className={miss.note ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>{kind === "ajuste" ? "Nota (obligatoria)" : "Nota (opcional)"}</span>
        <input
          value={note}
          placeholder={kind === "ajuste" ? "Ej. merma por humedad" : "Ej. compra o consumo del día"}
          onChange={(event) => { setNote(event.target.value); setMiss((current) => ({ ...current, note: "" })); }}
          disabled={pending}
        />
        {miss.note ? <span className="field-miss">{miss.note}</span> : null}
      </label>
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inv-form__actions">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Registrar"}
        </button>
      </div>
    </form>
  );
}

function titleFor(kind: MovementKind): string {
  if (kind === "entrada") return "¿Cuánto entró?";
  if (kind === "salida") return "¿Cuánto salió?";
  return "¿Cuánto hay ahora?";
}

function decimalStep(places: number): string {
  if (places <= 0) return "1";
  return `0.${"0".repeat(places - 1)}1`;
}

function review(input: {
  kind: MovementKind;
  quantity: string;
  note: string;
  takeAll: boolean;
  whole: boolean;
  decimals: number;
}): string {
  if (input.kind === "ajuste" && !input.note.trim()) {
    return "El ajuste requiere una nota.";
  }
  if (input.takeAll) return "";
  const value = Number(input.quantity);
  if (!input.quantity.trim() || !Number.isFinite(value)) {
    return "Escribe la cantidad.";
  }
  if (input.kind === "ajuste" && value < 0) return "La cantidad contada no puede ser negativa.";
  if (input.kind !== "ajuste" && value <= 0) return "La cantidad debe ser mayor que cero.";
  if (input.whole && !/^\d+$/.test(input.quantity.trim())) {
    return "Esta unidad solo admite cantidades enteras.";
  }
  if (!input.whole && !respectsPlaces(input.quantity, input.decimals)) {
    return `Esta unidad admite como máximo ${input.decimals} decimales.`;
  }
  return "";
}

function respectsPlaces(raw: string, places: number): boolean {
  const fraction = raw.trim().split(".")[1] ?? "";
  return fraction.length <= places;
}

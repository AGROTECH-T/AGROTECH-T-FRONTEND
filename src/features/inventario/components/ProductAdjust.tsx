/**
 * Ajuste de inventario sobre el listado.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type FormEvent } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { displayQuantity } from "../services/equivalence.ts";
import { ADJUSTMENT_REASONS } from "../services/adjustmentReasons.ts";
import { createMovement, getProduct } from "../services/inventoryApi.ts";
import type { AdjustmentReason, Product } from "../types/index.ts";
import { useProductPhoto } from "./productPhoto.ts";
import { PhotoLight } from "./ProductView.tsx";

/**
 * Compara el stock registrado con el conteo y guarda el ajuste.
 */
export function ProductAdjustWindow({
  farmId,
  product,
  onBack,
  onChanged,
  onNotice,
}: Readonly<{
  farmId: number;
  product: Product;
  onBack: () => void;
  onChanged: (product: Product) => void;
  onNotice?: (message: string) => void;
}>) {
  const registered = displayQuantity(product.quantity, product.unit_nature);
  const lent = displayQuantity(product.lent_quantity, product.unit_nature);
  const [counted, setCounted] = useState(registered);
  const [reason, setReason] = useState<AdjustmentReason>("conteo_fisico");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [openPhoto, setOpenPhoto] = useState(false);
  const photo = useProductPhoto(farmId, product);
  const delta = Number(counted) - Number(product.quantity);
  const unit = product.unit_nature === "continua" ? product.base_symbol : product.unit_label;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!counted.trim() || !Number.isFinite(delta)) {
      setError("Escribe el stock contado.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await createMovement(farmId, product.id, {
        kind: "ajuste",
        quantity: counted.trim(),
        reason,
        note: note.trim(),
      });
      onChanged(await getProduct(farmId, product.id));
      onNotice?.("ajuste guardado");
      onBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el ajuste");
      setPending(false);
    }
  };

  return (
    <FormWindow title="Ajuste de inventario" onClose={onBack} wide>
      <form className="form-window__body adj" onSubmit={(event) => void submit(event)}>
        <div className="adj__side">
          {photo ? (
            <button type="button" className="pv__shot" onClick={() => setOpenPhoto(true)}>
              <img src={photo} alt={product.name} />
            </button>
          ) : (
            <div className="pv__empty">Sin foto</div>
          )}
          <strong>{product.name}</strong>
          <span>{unitCaption(product)}</span>
        </div>
        <div className="adj__main">
          <div className="adj__stocks">
            <p>
              <span>Stock registrado</span>
              <strong>{registered}</strong>
              <small>{unit}</small>
            </p>
            <p className="adj__lent">
              <span>Prestado</span>
              <strong>{lent}</strong>
              <small>{unit}</small>
            </p>
            <label className="adj__count">
              <span>
                <CountIcon /> Stock actual (conteo)
              </span>
              <input
                value={counted}
                onChange={(event) => setCounted(event.target.value)}
                disabled={pending}
                autoFocus
                inputMode="decimal"
                aria-label="Stock actual contado"
              />
              <small>{unit}</small>
            </label>
            <p className={delta < 0 ? "is-down" : ""}>
              <span>Diferencia</span>
              <strong>{deltaText(delta, product)}</strong>
              <small>{unit}</small>
            </p>
          </div>
          <label className="inv-form__field">
            <span>Motivo del ajuste</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as AdjustmentReason)}
              disabled={pending}
            >
              {ADJUSTMENT_REASONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inv-form__field">
            <span>Observación (opcional)</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={pending} rows={3} />
          </label>
          {error ? <p className="inv-form__error" role="alert">{error}</p> : null}
          <div className="inv-form__actions">
            <button type="button" className="btn-danger" onClick={onBack} disabled={pending}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar ajuste"}</button>
          </div>
        </div>
      </form>
      {openPhoto && photo ? <PhotoLight src={photo} alt={product.name} onClose={() => setOpenPhoto(false)} /> : null}
    </FormWindow>
  );
}

function unitCaption(product: Product): string {
  const factor = Number(product.unit_factor);
  if (!Number.isFinite(factor) || factor === 1) return product.unit_label;
  const content = `${String(factor)} ${product.base_symbol}`;
  if (product.unit_label.toLowerCase().includes(content.toLowerCase())) return product.unit_label;
  return `${product.unit_label} (${content})`;
}

function deltaText(delta: number, product: Product): string {
  if (!Number.isFinite(delta)) return "—";
  const text = displayQuantity(String(Math.abs(delta)), product.unit_nature);
  if (delta > 0) return `+${text}`;
  if (delta < 0) return `−${text}`;
  return text;
}

/**
 * Ícono del conteo: una lupa sobre una caja.
 * @returns Marca del campo destacado.
 */
function CountIcon() {
  return (
    <svg className="adj__count-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.4 14.4 2.6 2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

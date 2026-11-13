/**
 * Detalle de producto y movimientos.
 *
 * Propósito: ver stock y registrar entrada, salida o ajuste.
 * Contexto: en ajuste la cantidad es el stock final.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { createMovement, getProduct, listMovements } from "../services/inventoryApi.ts";
import { stockStatus, stockStatusLabel } from "../services/stockStatus.ts";
import type { Movement, MovementKind, Product } from "../types/index.ts";

type Props = {
  farmId: number;
  product: Product;
  onBack: () => void;
  onChanged: (product: Product) => void;
  /** Capacidad de escritura de la finca (F6); sin ella no se ofrece el registro. */
  canWrite?: boolean;
};

/**
 * Ficha del producto con historial y formulario de movimiento.
 * @param props - Finca, producto y callbacks.
 * @returns Detalle.
 */
export function ProductDetail({
  farmId,
  product,
  onBack,
  onChanged,
  canWrite = true,
}: Readonly<Props>) {
  const [current, setCurrent] = useState(product);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [kind, setKind] = useState<MovementKind>("entrada");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const status = stockStatus(current.quantity, current.min_stock);

  useEffect(() => {
    void listMovements(farmId, product.id)
      .then(setMovements)
      .catch(() => setMovements([]));
  }, [farmId, product.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!quantity.trim() || Number(quantity) <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    setPending(true);
    try {
      await createMovement(farmId, product.id, kind, quantity, note);
      const fresh = await getProduct(farmId, product.id);
      setCurrent(fresh);
      onChanged(fresh);
      setMovements(await listMovements(farmId, product.id));
      setQuantity("");
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el movimiento");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="inv-detail">
      <button type="button" className="btn-secondary" onClick={onBack}>
        Volver al listado
      </button>
      <header className="panel__header">
        <h2 className="panel__title">{current.name}</h2>
        <p className="panel__lead">
          Código {current.barcode} · {current.category_label} · {stockStatusLabel(status)}
        </p>
      </header>
      <p className="inv-detail__stock">
        Stock: <strong>{current.quantity}</strong> {current.unit_label}
      </p>

      {canWrite ? (
      <form className="inv-form" onSubmit={(event) => void submit(event)}>
        <h3 className="inv-form__title">Registrar movimiento</h3>
        <label className="inv-form__field">
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as MovementKind)} disabled={pending}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="ajuste">Ajuste (stock final)</option>
          </select>
        </label>
        <label className="inv-form__field">
          <span>Cantidad</span>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="inv-form__field">
          <span>Nota (opcional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} disabled={pending} />
        </label>
        {error ? (
          <p className="inv-form__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Registrar"}
        </button>
      </form>
      ) : (
        <p className="panel__lead">Tu rol en esta finca solo permite consultar el inventario.</p>
      )}

      <h3 className="inv-form__title">Últimos movimientos</h3>
      {movements.length === 0 ? (
        <p className="panel__lead">Todavía no hay movimientos.</p>
      ) : (
        <ul className="inv-moves">
          {movements.map((move) => (
            <li key={move.id}>
              <strong>{move.kind}</strong> · {move.quantity}
              {move.note ? ` · ${move.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Préstamo y devolución de un producto.
 *
 * Propósito: pedir los datos de quien lo lleva y registrar la devolución.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { displayQuantity } from "../services/equivalence.ts";
import { lendProduct, listLoans, returnLoan, downloadLoanHistory } from "../services/inventoryApi.ts";
import type { Product, ProductLoan } from "../types/index.ts";
import { ConfirmModal } from "./ConfirmModal.tsx";

type Done = (product: Product) => void;

/**
 * Ventana para prestar: nombre, documento y cantidad.
 */
export function LendWindow({
  farmId,
  product,
  onClose,
  onDone,
}: Readonly<{
  farmId: number;
  product: Product;
  onClose: () => void;
  onDone: Done;
}>) {
  const [name, setName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [gaps, setGaps] = useState<Partial<Record<"name" | "document" | "quantity", string>>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const dirty = name.trim() !== "" || documentNumber.trim() !== "" || quantity.trim() !== "";

  const leave = () => {
    if (dirty) {
      setAskCancel(true);
      return;
    }
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<"name" | "document" | "quantity", string>> = {};
    if (!name.trim()) next.name = "Escribe el nombre completo.";
    if (!/^\d{5,15}$/.test(documentNumber)) next.document = "Solo números. Ejemplo: 1234567890";
    if (!quantity.trim()) next.quantity = "Escribe la cantidad.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      const result = await lendProduct(farmId, product.id, {
        borrower_name: name.trim(),
        document_number: documentNumber.trim(),
        quantity: quantity.trim(),
      });
      onDone(result.product);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo prestar");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormWindow title="Prestar producto" onClose={leave}>
      <form className="inv-form" onSubmit={(event) => void submit(event)} noValidate>
        <p className="inv-equivalence">
          {product.name}. Disponible: {displayQuantity(product.quantity, product.unit_nature)} {product.unit_label}
        </p>
        <label className={gaps.name ? "inv-form__field is-miss" : "inv-form__field"}>
          <span>Nombre completo</span>
          <input value={name} onChange={(event) => { setName(event.target.value); setGaps((current) => ({ ...current, name: undefined })); }} disabled={pending} />
          {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
        </label>
        <label className={gaps.document ? "inv-form__field is-miss" : "inv-form__field"}>
          <span>Número de documento</span>
          <input
            inputMode="numeric"
            maxLength={15}
            value={documentNumber}
            onChange={(event) => {
              setDocumentNumber(event.target.value.replace(/\D/g, "").slice(0, 15));
              setGaps((current) => ({ ...current, document: undefined }));
            }}
            disabled={pending}
          />
          {gaps.document ? <span className="field-miss">{gaps.document}</span> : null}
        </label>
        <label className={gaps.quantity ? "inv-form__field is-miss" : "inv-form__field"}>
          <span>Cantidad</span>
          <input
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(event) => { setQuantity(event.target.value); setGaps((current) => ({ ...current, quantity: undefined })); }}
            disabled={pending}
          />
          {gaps.quantity ? <span className="field-miss">{gaps.quantity}</span> : null}
        </label>
        {error ? <p className="inv-form__error" role="alert">{error}</p> : null}
        <div className="inv-form__actions">
          <button type="button" className="btn-danger" onClick={leave} disabled={pending}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Guardando..." : "Prestar"}</button>
        </div>
      </form>
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={onClose}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
    </FormWindow>
  );
}

/**
 * Ventana para devolver un préstamo de este producto.
 */
export function ReturnWindow({
  farmId,
  product,
  onClose,
  onDone,
}: Readonly<{
  farmId: number;
  product: Product;
  onClose: () => void;
  onDone: Done;
}>) {
  const [rows, setRows] = useState<ProductLoan[]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void listLoans(farmId, product.id)
      .then((items) => {
        setRows(items);
        setAmounts(Object.fromEntries(items.map((item) => [item.id, displayQuantity(item.pending, product.unit_nature)])));
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar los préstamos");
      })
      .finally(() => setLoading(false));
  }, [farmId, product.id, product.unit_nature]);

  const giveBack = async (loan: ProductLoan) => {
    const quantity = (amounts[loan.id] ?? "").trim();
    if (!quantity) {
      setError("Escribe la cantidad.");
      return;
    }
    setPendingId(loan.id);
    setError("");
    try {
      const result = await returnLoan(farmId, product.id, loan.id, quantity, (notes[loan.id] ?? "").trim());
      onDone(result.product);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo devolver");
      setPendingId(null);
    }
  };

  const unit = product.unit_nature === "continua" ? product.base_symbol : product.unit_label;

  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadLoanHistory(farmId, product.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el Excel");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <FormWindow title="Devolver producto" onClose={onClose} wide>
      <div className="form-window__body give">
        <div className="give__head">
          <p className="panel__lead">Registre la devolución del producto prestado.</p>
          <button type="button" className="btn-secondary" onClick={() => void download()} disabled={downloading || pendingId != null}>
            {downloading ? "Descargando..." : "Descargar Excel"}
          </button>
        </div>
        {loading ? <p className="panel__lead">Cargando préstamos...</p> : null}
        {!loading && rows.length === 0 ? <p className="panel__lead">Nadie tiene este producto prestado.</p> : null}
        {rows.length > 0 ? (
          <div className="give__table">
            <table>
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Documento</th>
                  <th>Cantidad</th>
                  <th>Observación</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.borrower_name}</td>
                    <td>{loan.document_number}</td>
                    <td>
                      <div className="give__amount">
                        <input
                          inputMode="decimal"
                          value={amounts[loan.id] ?? ""}
                          onChange={(event) => setAmounts((current) => ({ ...current, [loan.id]: event.target.value }))}
                          disabled={pendingId != null}
                        />
                        <span>{unit}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        className="give__note"
                        placeholder="Opcional"
                        value={notes[loan.id] ?? ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [loan.id]: event.target.value }))}
                        disabled={pendingId != null}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn-primary" disabled={pendingId != null} onClick={() => void giveBack(loan)}>
                        {pendingId === loan.id ? "..." : "Devolver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {error ? <p className="inv-form__error" role="alert">{error}</p> : null}
        <div className="inv-form__actions give__actions">
          <button type="button" className="btn-danger" onClick={onClose} disabled={pendingId != null}>Cancelar</button>
        </div>
      </div>
    </FormWindow>
  );
}

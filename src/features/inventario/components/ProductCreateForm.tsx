/**
 * Formulario de alta de insumo.
 *
 * Propósito: nombre, barcode y selects del catálogo del sistema.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { createProduct, getInventoryCatalog } from "../services/inventoryApi.ts";
import type { InventoryCatalog, Product, ProductDraft } from "../types/index.ts";

type Props = {
  farmId: number;
  onCreated: (product: Product) => void;
  onCancel: () => void;
};

const empty: ProductDraft = {
  name: "",
  barcode: "",
  unit: "",
  category: "",
  min_stock: "0",
};

function review(draft: ProductDraft): string {
  if (!draft.name.trim()) return "Escribe el nombre del insumo.";
  if (!draft.barcode.trim()) return "El código de barras es obligatorio.";
  if (!draft.unit) return "Elige una unidad.";
  if (!draft.category) return "Elige una categoría.";
  const min = Number(draft.min_stock);
  if (!Number.isFinite(min) || min < 0) return "El stock mínimo no puede ser negativo.";
  return "";
}

/**
 * Alta rápida: el usuario solo elige unidad y categoría.
 */
export function ProductCreateForm({ farmId, onCreated, onCancel }: Readonly<Props>) {
  const [draft, setDraft] = useState<ProductDraft>(empty);
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [gap, setGap] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getInventoryCatalog()
      .then((data) => {
        setCatalog(data);
        setDraft((current) => ({
          ...current,
          unit: current.unit || data.units[0]?.id || "",
          category: current.category || data.categories[0]?.id || "",
        }));
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
      });
  }, []);

  const edit = (key: keyof ProductDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setGap("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = review(draft);
    setGap(message);
    setError("");
    if (message) return;
    setPending(true);
    try {
      onCreated(await createProduct(farmId, draft));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el insumo");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="inv-form" onSubmit={(event) => void submit(event)} noValidate>
      <h2 className="inv-form__title">Nuevo insumo</h2>
      <label className="inv-form__field">
        <span>Nombre</span>
        <input
          value={draft.name}
          placeholder="Ej. Concentrado inicio"
          onChange={(e) => edit("name")(e.target.value)}
          disabled={pending}
        />
      </label>
      <label className="inv-form__field">
        <span>Código de barras</span>
        <input
          value={draft.barcode}
          placeholder="Obligatorio"
          onChange={(e) => edit("barcode")(e.target.value)}
          disabled={pending}
        />
      </label>
      <label className="inv-form__field">
        <span>Unidad</span>
        <select
          value={draft.unit}
          onChange={(e) => edit("unit")(e.target.value)}
          disabled={pending || !catalog}
        >
          {(catalog?.units ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="inv-form__field">
        <span>Categoría</span>
        <select
          value={draft.category}
          onChange={(e) => edit("category")(e.target.value)}
          disabled={pending || !catalog}
        >
          {(catalog?.categories ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="inv-form__field">
        <span>Stock mínimo</span>
        <input
          type="number"
          min="0"
          step="0.001"
          value={draft.min_stock}
          onChange={(e) => edit("min_stock")(e.target.value)}
          disabled={pending}
        />
      </label>
      {gap ? <p className="inv-form__gap">{gap}</p> : null}
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inv-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={pending || !catalog}>
          {pending ? "Guardando..." : "Crear insumo"}
        </button>
      </div>
    </form>
  );
}

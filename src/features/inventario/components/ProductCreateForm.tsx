/**
 * Formulario de alta de insumo.
 *
 * Propósito: nombre, código opcional y unidad filtrada por categoría.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createCategory,
  createCustomUnit,
  createMovement,
  createProduct,
  getInventoryCatalog,
  getProduct,
  uploadProductImage,
} from "../services/inventoryApi.ts";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";
import { equivalenceText, isWholeUnit } from "../services/equivalence.ts";
import { shrinkPhoto } from "../services/photo.ts";
import type { InventoryCatalog, Product, ProductDraft, UnitOption } from "../types/index.ts";
import { ProductPhotoPicker } from "./ProductPhotoPicker.tsx";

type Props = {
  farmId: number;
  initialBarcode?: string;
  initialName?: string;
  onCreated: (product: Product) => void;
  onCancel: () => void;
  onNotice?: (message: string) => void;
};

const empty: ProductDraft = {
  name: "",
  barcode: "",
  unit: "",
  category: "",
  min_stock: "0",
  initial_quantity: "0",
};

type Gaps = Partial<Record<"name" | "category" | "unit" | "initial_quantity" | "min_stock", string>>;

function review(draft: ProductDraft, unit: UnitOption | undefined): Gaps {
  const gaps: Gaps = {};
  if (!draft.name.trim()) gaps.name = "Escribe el nombre.";
  if (!draft.category) gaps.category = "Elige una categoría.";
  if (!draft.unit || !unit) gaps.unit = "Elige una unidad.";
  const minText = draft.min_stock.trim();
  const min = Number(minText || "0");
  if (!minText) gaps.min_stock = "Escribe el stock mínimo.";
  else if (!Number.isFinite(min) || min < 0) gaps.min_stock = "No puede ser negativo.";
  else if (unit && isWholeUnit(unit.nature) && !Number.isInteger(min)) {
    gaps.min_stock = "Debe ser un número entero.";
  }
  if (unit) {
    const quantity = reviewQuantity(draft.initial_quantity, unit);
    if (quantity) gaps.initial_quantity = quantity;
  }
  return gaps;
}

function reviewQuantity(raw: string, unit: UnitOption): string {
  const text = raw.trim() || "0";
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return "La cantidad inicial no puede ser negativa.";
  if (isWholeUnit(unit.nature)) {
    if (!/^\d+$/.test(text)) return "Esta unidad solo admite cantidades enteras.";
    return "";
  }
  const fraction = text.split(".")[1] ?? "";
  if (fraction.length > unit.decimal_places) {
    return `Esta unidad admite como máximo ${unit.decimal_places} decimales.`;
  }
  return "";
}

/**
 * Alta rápida: categoría primero y unidades compatibles.
 */
export function ProductCreateForm({
  farmId,
  initialBarcode = "",
  initialName = "",
  onCreated,
  onCancel,
  onNotice,
}: Readonly<Props>) {
  const [draft, setDraft] = useState<ProductDraft>({
    ...empty,
    barcode: initialBarcode,
    name: initialName,
  });
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [gaps, setGaps] = useState<Gaps>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [maker, setMaker] = useState<"" | "category" | "unit">("");
  const [makerDirty, setMakerDirty] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    void getInventoryCatalog()
      .then(setCatalog)
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
      });
  }, []);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreview("");
  };

  const dirty =
    Boolean(photo) ||
    (maker !== "" && makerDirty) ||
    draft.name !== initialName ||
    draft.barcode !== initialBarcode ||
    draft.category !== "" ||
    draft.unit !== "" ||
    draft.initial_quantity !== "0" ||
    draft.min_stock !== "0";

  const leave = () => {
    if (dirty) {
      setAskCancel(true);
      return;
    }
    onCancel();
  };

  const units = useMemo(() => unitsFor(catalog, draft.category), [catalog, draft.category]);
  const selected = units.find((item) => item.id === draft.unit);
  const equivalent = selected
    ? equivalenceText(draft.initial_quantity, selected.factor, selected.base_symbol)
    : null;

  const edit = (key: keyof ProductDraft) => (value: string) => {
    setDraft((current) => {
      if (key !== "category") return { ...current, [key]: value };
      const nextUnits = unitsFor(catalog, value);
      const stillValid = nextUnits.some((item) => item.id === current.unit);
      return {
        ...current,
        category: value,
        unit: stillValid ? current.unit : nextUnits[0]?.id ?? "",
      };
    });
    setGaps((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = review(draft, selected);
    setGaps(next);
    setError("");
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      const created = await createProduct(farmId, draft);
      let saved = created;
      if (photo) {
        try {
          saved = await uploadProductImage(farmId, created.id, await shrinkPhoto(photo));
        } catch {
          onNotice?.("producto creado sin foto");
        }
      }
      const initial = Number(draft.initial_quantity.trim() || "0");
      if (initial > 0) {
        await createMovement(farmId, created.id, {
          kind: "entrada",
          quantity: draft.initial_quantity.trim(),
          note: "Cantidad inicial",
          idempotencyKey: crypto.randomUUID(),
        });
        onCreated(await getProduct(farmId, created.id));
      } else {
        onCreated(saved);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el insumo");
    } finally {
      setPending(false);
    }
  };

  const minStep = selected && isWholeUnit(selected.nature) ? "1" : "0.001";

  return (
    <FormWindow title="Crear producto" onClose={leave}>
    <form className="inv-form inv-form--create" onSubmit={(event) => void submit(event)} noValidate>
      <p className="inv-equivalence">Escribe el nombre y cuánto tienes. Si no tienes, deja 0.</p>
      <ProductPhotoPicker preview={preview} busy={pending} onPick={pickPhoto} onRemove={clearPhoto} />
      <label className={gaps.name ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Nombre</span>
        <input
          value={draft.name}
          placeholder="Ej. Concentrado para pollos"
          onChange={(event) => edit("name")(event.target.value)}
          disabled={pending}
        />
        {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
      </label>
      <label className="inv-form__field">
        <span>Código de barras (opcional)</span>
        <input
          value={draft.barcode}
          placeholder="Único en esta finca, si el empaque lo trae"
          onChange={(event) => edit("barcode")(event.target.value)}
          disabled={pending}
        />
      </label>
      <label className={gaps.category ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Categoría</span>
        <select
          value={maker === "category" ? "__create__" : draft.category}
          onChange={(event) => {
            if (event.target.value === "__create__") {
              setMakerDirty(false);
              setMaker("category");
              return;
            }
            setMaker("");
            edit("category")(event.target.value);
          }}
          disabled={pending || !catalog}
        >
          <option value="__create__">+ Crear categoría</option>
          <option value="">Escoge tu categoría</option>
          {(catalog?.categories ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {gaps.category ? <span className="field-miss">{gaps.category}</span> : null}
      </label>
      {maker === "category" ? (
        <CategoryMaker
          farmId={farmId}
          catalog={catalog}
          pending={pending}
          onPending={setPending}
          onError={setError}
          onDirty={setMakerDirty}
          onDone={(fresh, categoryId, alsoUnit) => {
            setCatalog(fresh);
            edit("category")(categoryId);
            setMaker("");
            onNotice?.("categoría creada");
            if (alsoUnit) onNotice?.("unidad creada");
          }}
        />
      ) : null}
      <label className={gaps.unit ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Unidad</span>
        <select
          value={maker === "unit" ? "__create__" : draft.unit}
          onChange={(event) => {
            if (event.target.value === "__create__") {
              setMakerDirty(false);
              setMaker("unit");
              return;
            }
            setMaker(maker === "unit" ? "" : maker);
            edit("unit")(event.target.value);
          }}
          disabled={pending || !draft.category}
        >
          <option value="__create__">+ Crear unidad</option>
          <option value="">Escoge tu unidad</option>
          {units.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {gaps.unit ? <span className="field-miss">{gaps.unit}</span> : null}
      </label>
      {maker === "unit" ? (
        <UnitMaker
          farmId={farmId}
          catalog={catalog}
          categoryId={draft.category}
          pending={pending}
          onPending={setPending}
          onError={setError}
          onDirty={setMakerDirty}
          onDone={async (unitId) => {
            const fresh = await getInventoryCatalog();
            setCatalog(fresh);
            edit("unit")(unitId);
            setMaker("");
            onNotice?.("unidad creada");
          }}
        />
      ) : null}
      <label className={gaps.initial_quantity ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Cantidad que tienes ahora</span>
        <input
          type="number"
          min="0"
          step={minStep}
          value={draft.initial_quantity}
          onChange={(event) => edit("initial_quantity")(event.target.value)}
          disabled={pending}
        />
        {gaps.initial_quantity ? <span className="field-miss">{gaps.initial_quantity}</span> : null}
      </label>
      {equivalent ? <p className="inv-equivalence">= {equivalent}</p> : null}
      <label className={gaps.min_stock ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Stock mínimo</span>
        <input
          type="number"
          min="0"
          step={minStep}
          value={draft.min_stock}
          onChange={(event) => edit("min_stock")(event.target.value)}
          disabled={pending}
        />
        {gaps.min_stock ? <span className="field-miss">{gaps.min_stock}</span> : null}
      </label>
      <p className="inv-equivalence">Aviso en la lista cuando quede en este número o menos.</p>
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inv-form__actions">
        <button type="button" className="btn-danger" onClick={leave} disabled={pending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary inv-save" disabled={pending || !catalog}>
          {pending ? "Guardando..." : "Guardar producto"}
        </button>
      </div>
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={onCancel}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
    </form>
    </FormWindow>
  );
}

function CategoryMaker({
  farmId,
  catalog,
  pending,
  onPending,
  onError,
  onDirty,
  onDone,
}: Readonly<{
  farmId: number;
  catalog: InventoryCatalog | null;
  pending: boolean;
  onPending: (value: boolean) => void;
  onError: (value: string) => void;
  onDirty?: (dirty: boolean) => void;
  onDone: (catalog: InventoryCatalog, categoryId: string, alsoUnit: boolean) => void;
}>) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"nueva" | "traer">("nueva");
  const [source, setSource] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [unitName, setUnitName] = useState("");
  const [base, setBase] = useState("u");
  const [miss, setMiss] = useState("");
  const sourceUnits = unitsFor(catalog, source);

  useEffect(() => {
    onDirty?.(name.trim() !== "" || unitName.trim() !== "" || source !== "" || picked.length > 0 || base !== "u");
  }, [name, unitName, source, picked, base, onDirty]);

  const save = async () => {
    if (!name.trim()) {
      setMiss("name");
      return;
    }
    if (mode === "nueva" && !unitName.trim()) {
      setMiss("unit");
      return;
    }
    if (mode === "traer" && !source) {
      setMiss("source");
      return;
    }
    if (mode === "traer" && picked.length === 0) {
      setMiss("units");
      return;
    }
    setMiss("");
    onPending(true);
    onError("");
    try {
      const fresh = await createCategory(farmId, {
        name: name.trim(),
        copy_from: mode === "traer" ? source : "",
        unit_codes: mode === "traer" ? picked : [],
        unit_label: mode === "nueva" ? unitName.trim() : "",
        base_unit: base,
        factor: "1",
      });
      const categoryId = fresh.created ?? "";
      if (!categoryId) {
        onError("No se pudo crear la categoría.");
        return;
      }
      onDone(fresh, categoryId, mode === "nueva" && unitName.trim() !== "");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "No se pudo crear la categoría");
    } finally {
      onPending(false);
    }
  };

  return (
    <div className="inv-maker">
      <label className={miss === "name" ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Nombre de la categoría</span>
        <input value={name} onChange={(event) => { setName(event.target.value); setMiss(""); }} disabled={pending} />
        {miss === "name" ? <span className="field-miss">Escribe el nombre.</span> : null}
      </label>
      <div className="inv-maker__row">
        <button type="button" className={mode === "nueva" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("nueva")}>
          Unidad nueva
        </button>
        <button type="button" className={mode === "traer" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("traer")}>
          Traer de otra
        </button>
      </div>
      {mode === "nueva" ? (
        <>
          <label className={miss === "unit" ? "inv-form__field is-miss" : "inv-form__field"}>
            <span>Nombre de la unidad</span>
            <input value={unitName} placeholder="Ej. Bulto" onChange={(event) => { setUnitName(event.target.value); setMiss(""); }} disabled={pending} />
            {miss === "unit" ? <span className="field-miss">Escribe el nombre.</span> : null}
          </label>
          <label className="inv-form__field">
            <span>Se mide en</span>
            <select value={base} onChange={(event) => setBase(event.target.value)} disabled={pending}>
              {(catalog?.base_units ?? [{ id: "u", label: "Unidad (u)", nature: "discreta" }]).map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className={miss === "source" ? "inv-form__field is-miss" : "inv-form__field"}>
            <span>Categoría de origen</span>
            <select value={source} onChange={(event) => { setSource(event.target.value); setPicked([]); setMiss(""); }} disabled={pending}>
              <option value="">Escoge tu categoría</option>
              {(catalog?.categories ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            {miss === "source" ? <span className="field-miss">Elige una categoría.</span> : null}
          </label>
          {sourceUnits.map((item) => (
            <label key={item.id} className="inv-check">
              <input
                type="checkbox"
                checked={picked.includes(item.id)}
                onChange={() => setPicked((current) => (
                  current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]
                ))}
              />
              {item.label}
            </label>
          ))}
          {miss === "units" ? <span className="field-miss">Elige al menos una.</span> : null}
        </>
      )}
      <button type="button" className="btn-primary inv-save" disabled={pending} onClick={() => void save()}>
        Guardar categoría
      </button>
    </div>
  );
}

function UnitMaker({
  farmId,
  catalog,
  categoryId,
  pending,
  onPending,
  onError,
  onDirty,
  onDone,
}: Readonly<{
  farmId: number;
  catalog: InventoryCatalog | null;
  categoryId: string;
  pending: boolean;
  onPending: (value: boolean) => void;
  onError: (value: string) => void;
  onDirty?: (dirty: boolean) => void;
  onDone: (unitId: string) => Promise<void>;
}>) {
  const [label, setLabel] = useState("");
  const [base, setBase] = useState("u");
  const [factor, setFactor] = useState("1");
  const [miss, setMiss] = useState("");

  useEffect(() => {
    onDirty?.(label.trim() !== "" || factor !== "1" || base !== "u");
  }, [label, factor, base, onDirty]);

  const save = async () => {
    if (!categoryId) {
      setMiss("category");
      return;
    }
    if (!label.trim()) {
      setMiss("name");
      return;
    }
    setMiss("");
    onPending(true);
    onError("");
    try {
      const created = await createCustomUnit(farmId, {
        stem: label.trim(),
        label: label.trim(),
        base_unit: base,
        factor: factor.trim() || "1",
        categories: [categoryId],
      });
      await onDone(created.id);
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "No se pudo crear la unidad");
    } finally {
      onPending(false);
    }
  };

  return (
    <div className="inv-maker">
      {miss === "category" ? <span className="field-miss">Elige una categoría.</span> : null}
      <label className={miss === "name" ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Nombre de la unidad</span>
        <input value={label} onChange={(event) => { setLabel(event.target.value); setMiss(""); }} disabled={pending} />
        {miss === "name" ? <span className="field-miss">Escribe el nombre.</span> : null}
      </label>
      <label className="inv-form__field">
        <span>Se mide en</span>
        <select value={base} onChange={(event) => setBase(event.target.value)} disabled={pending}>
          {(catalog?.base_units ?? [{ id: "u", label: "Unidad (u)", nature: "discreta" }]).map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="inv-form__field">
        <span>Cuántas caben</span>
        <input value={factor} onChange={(event) => setFactor(event.target.value)} disabled={pending} />
      </label>
      <button type="button" className="btn-primary inv-save" disabled={pending} onClick={() => void save()}>
        Guardar unidad
      </button>
    </div>
  );
}

function unitsFor(catalog: InventoryCatalog | null, category: string): UnitOption[] {
  if (!catalog || !category) return [];
  const allowed = new Set(catalog.units_by_category[category] ?? []);
  return catalog.units.filter((unit) => allowed.has(unit.id));
}

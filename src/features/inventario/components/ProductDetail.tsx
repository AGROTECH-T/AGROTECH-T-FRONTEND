/**
 * Detalle de producto y movimientos.
 *
 * Propósito: corregir la cantidad contada y editar los datos del producto.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import type { FarmRole } from "../../farms/types/index.ts";
import {
  deleteProduct,
  getInventoryCatalog,
  listMovements,
  removeProductImage,
  updateProduct,
  uploadProductImage,
} from "../services/inventoryApi.ts";
import { displayQuantity, equivalenceText } from "../services/equivalence.ts";
import { shrinkPhoto } from "../services/photo.ts";
import { stockStatus, stockStatusLabel } from "../services/stockStatus.ts";
import type { InventoryCatalog, Movement, Product } from "../types/index.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";
import { MovementForm } from "./MovementForm.tsx";
import { ProductPhotoPicker } from "./ProductPhotoPicker.tsx";
import { useProductPhoto } from "./productPhoto.ts";

type Props = {
  farmId: number;
  product: Product;
  role: FarmRole;
  intent?: "ver" | "actualizar" | "ajuste";
  onBack: () => void;
  onChanged: (product: Product) => void;
  onNotice?: (message: string) => void;
};

/**
 * Ficha del producto con historial y formulario de movimiento.
 * @param props - Finca, producto, rol y callbacks.
 * @returns Detalle.
 */
export function ProductDetail({
  farmId,
  product,
  role,
  intent = "ver",
  onBack,
  onChanged,
  onNotice,
}: Readonly<Props>) {
  const [current, setCurrent] = useState(product);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [notice, setNotice] = useState("");
  const status = current.is_active
    ? stockStatus(current.quantity, current.min_stock)
    : "inactivo";
  const qty = displayQuantity(current.quantity, current.unit_nature);
  const equivalent = equivalenceText(qty, current.unit_factor, current.base_symbol);
  const isAdmin = role === "administrador";

  useEffect(() => {
    setCurrent(product);
  }, [product]);

  useEffect(() => {
    void listMovements(farmId, product.id)
      .then(setMovements)
      .catch(() => setMovements([]));
  }, [farmId, product.id, current.updated_at]);

  return (
    <section className="inv-detail">
      <BackButton onClick={onBack} />
      <header className="panel__header">
        <h2 className="panel__title">
          {intent === "actualizar" ? "Editar producto" : intent === "ajuste" ? "Ajuste" : "Ver producto"}
        </h2>
        <p className="panel__lead">{current.name}</p>
      </header>
      {intent === "actualizar" ? null : (
        <>
          <p className="panel__lead">
            {current.barcode || "Sin código"} · {current.category_label} · {current.unit_label} ·{" "}
            {stockStatusLabel(status)}
          </p>
          <p className="inv-detail__stock">
            Stock: <strong>{qty}</strong> {current.unit_label}
            {equivalent ? <span className="inv-equivalence"> = {equivalent}</span> : null}
          </p>
          <p className="inv-equivalence">
            Mínimo: {displayQuantity(current.min_stock, current.unit_nature)} {current.unit_label}
          </p>
          <p className="inv-equivalence">
            Prestado: {displayQuantity(current.lent_quantity || "0", current.unit_nature)} {current.unit_label}
          </p>
        </>
      )}

      {notice ? <p className="inv-equivalence">{notice}</p> : null}
      {intent === "actualizar" && isAdmin ? (
        <ProductEditor
          farmId={farmId}
          product={current}
          onPhoto={(fresh) => {
            setCurrent(fresh);
            onChanged(fresh);
          }}
          onSaved={(fresh) => {
            setCurrent(fresh);
            onChanged(fresh);
            setNotice("Datos actualizados. La cantidad solo cambia con movimientos.");
            onNotice?.("producto actualizado");
          }}
        />
      ) : null}

      {intent === "ajuste" && isAdmin ? (
        <>
          <p className="inv-equivalence">Escribe la cantidad que contaste. Esa queda como stock.</p>
          <MovementForm
            farmId={farmId}
            product={current}
            role={role}
            lockedKind="ajuste"
            onDone={(fresh) => {
              setCurrent(fresh);
              onChanged(fresh);
              setNotice("Movimiento registrado.");
            }}
          />
        </>
      ) : null}

      {intent === "ver" ? (
      <>
      <h3 className="inv-form__title">Historial</h3>
      {movements.length === 0 ? (
        <p className="panel__lead">Todavía no hay movimientos.</p>
      ) : (
        <ul className="inv-moves">
          {movements.map((move) => {
            const moveQty = displayQuantity(move.quantity, current.unit_nature);
            const moveEq = equivalenceText(moveQty, current.unit_factor, current.base_symbol);
            const when = new Date(move.created_at).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            });
            return (
              <li key={move.id}>
                <strong>{kindLabel(move.kind)}</strong> · {moveQty} {current.unit_label}
                {moveEq ? ` = ${moveEq}` : ""} · {displayQuantity(move.stock_before, current.unit_nature)} →{" "}
                {displayQuantity(move.stock_after, current.unit_nature)} · {move.created_by_name} · {when}
                {move.note ? ` · ${move.note}` : ""}
              </li>
            );
          })}
        </ul>
      )}
      </>
      ) : null}
    </section>
  );
}

function kindLabel(kind: Movement["kind"]): string {
  if (kind === "entrada") return "Entrada";
  if (kind === "salida") return "Salida";
  return "Ajuste";
}

function ProductEditor({
  farmId,
  product,
  onSaved,
  onPhoto,
  onDirty,
  onCancel,
}: Readonly<{
  farmId: number;
  product: Product;
  onSaved: (product: Product) => void;
  onPhoto: (product: Product) => void;
  onDirty?: (dirty: boolean) => void;
  onCancel?: () => void;
}>) {
  const [name, setName] = useState(product.name);
  const [barcode, setBarcode] = useState(product.barcode);
  const [category, setCategory] = useState(product.category);
  const [unit, setUnit] = useState(product.unit);
  const [minStock, setMinStock] = useState(displayQuantity(product.min_stock, product.unit_nature));
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [gaps, setGaps] = useState<Partial<Record<"name" | "category" | "unit" | "min", string>>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const photo = useProductPhoto(farmId, product);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const savePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      onPhoto(await uploadProductImage(farmId, product.id, await shrinkPhoto(file)));
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : "No se pudo guardar la foto");
    } finally {
      setPhotoBusy(false);
    }
  };

  const dropPhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      onPhoto(await removeProductImage(farmId, product.id));
    } catch (cause) {
      setPhotoError(cause instanceof Error ? cause.message : "No se pudo eliminar la foto");
    } finally {
      setPhotoBusy(false);
    }
  };

  useEffect(() => {
    void getInventoryCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const units = (catalog?.units ?? []).filter((item) =>
    (catalog?.units_by_category[category] ?? []).includes(item.id),
  );

  useEffect(() => {
    const changed =
      name.trim() !== product.name ||
      barcode.trim() !== product.barcode ||
      category !== product.category ||
      unit !== product.unit ||
      (minStock.trim() || "0") !== displayQuantity(product.min_stock, product.unit_nature);
    onDirty?.(changed);
  }, [name, barcode, category, unit, minStock, product, onDirty]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<"name" | "category" | "unit" | "min", string>> = {};
    if (!name.trim()) next.name = "Escribe el nombre.";
    if (!category) next.category = "Elige una categoría.";
    if (!unit) next.unit = "Elige una unidad.";
    const min = Number(minStock.trim() || "0");
    if (!minStock.trim()) next.min = "Escribe el stock mínimo.";
    else if (!Number.isFinite(min) || min < 0) next.min = "No puede ser negativo.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      onSaved(
        await updateProduct(farmId, product.id, {
          name: name.trim(),
          barcode: barcode.trim(),
          min_stock: minStock.trim() || "0",
          category,
          unit,
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="inv-form" onSubmit={(event) => void submit(event)} noValidate>
      <ProductPhotoPicker
        preview={photo}
        busy={photoBusy || pending}
        hint="Cambia la foto cuando cambie el empaque o la presentación."
        onPick={(file) => void savePhoto(file)}
        onRemove={() => void dropPhoto()}
      />
      {photoError ? (
        <p className="inv-form__error" role="alert">
          {photoError}
        </p>
      ) : null}
      <label className={gaps.name ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Nombre</span>
        <input value={name} onChange={(event) => { setName(event.target.value); setGaps((current) => ({ ...current, name: undefined })); }} disabled={pending} />
        {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
      </label>
      <label className="inv-form__field">
        <span>Código de barras</span>
        <input value={barcode} onChange={(event) => setBarcode(event.target.value)} disabled={pending} />
      </label>
      <label className={gaps.category ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Categoría</span>
        <select
          value={category}
          disabled={pending || !catalog}
          onChange={(event) => {
            const next = event.target.value;
            setCategory(next);
            const allowed = catalog?.units_by_category[next] ?? [];
            if (!allowed.includes(unit)) setUnit(allowed[0] ?? "");
          }}
        >
          <option value="">Escoge tu categoría</option>
          {(catalog?.categories ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {gaps.category ? <span className="field-miss">{gaps.category}</span> : null}
      </label>
      <label className={gaps.unit ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Unidad</span>
        <select value={unit} disabled={pending} onChange={(event) => setUnit(event.target.value)}>
          <option value="">Escoge tu unidad</option>
          {units.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        {gaps.unit ? <span className="field-miss">{gaps.unit}</span> : null}
      </label>
      <label className={gaps.min ? "inv-form__field is-miss" : "inv-form__field"}>
        <span>Stock mínimo</span>
        <input
          type="number"
          min="0"
          step="0.001"
          value={minStock}
          onChange={(event) => { setMinStock(event.target.value); setGaps((current) => ({ ...current, min: undefined })); }}
          disabled={pending}
        />
        {gaps.min ? <span className="field-miss">{gaps.min}</span> : null}
      </label>
      {error ? (
        <p className="inv-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inv-form__actions">
        {onCancel ? (
          <button type="button" className="btn-danger" onClick={onCancel} disabled={pending}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/**
 * Edición del producto, en su propia ventana.
 * @param props - Producto, aviso y cierre.
 * @returns Ventana de actualizar.
 */
export function ProductUpdateWindow({
  farmId,
  product,
  onBack,
  onChanged,
  onRemoved,
  onNotice,
}: Readonly<{
  farmId: number;
  product: Product;
  onBack: () => void;
  onChanged: (product: Product) => void;
  onRemoved: (productId: number) => void;
  onNotice?: (message: string) => void;
}>) {
  const [dirty, setDirty] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [askActive, setAskActive] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [stateError, setStateError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const leave = () => {
    if (dirty) {
      setAskCancel(true);
      return;
    }
    onBack();
  };

  return (
    <FormWindow title="Editar producto" onClose={leave}>
      <ProductEditor
        farmId={farmId}
        product={product}
        onPhoto={onChanged}
        onDirty={setDirty}
        onCancel={leave}
        onSaved={(fresh) => {
          onChanged(fresh);
          onNotice?.("producto actualizado");
          onBack();
        }}
      />
      <section className="inv-status">
        <div className="inv-status__row">
          <div>
            <p className="inv-status__name">{product.is_active ? "Producto activo" : "Producto inactivo"}</p>
            <p>
              {product.is_active
                ? "Presione para inactivar. El historial se conserva."
                : "Presione para activar. El historial se conserva."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            className={product.is_active ? "inv-toggle is-on" : "inv-toggle"}
            aria-checked={product.is_active}
            aria-label={product.is_active ? "Presione para inactivar" : "Presione para activar"}
            onClick={() => setAskActive(true)}
          >
            <span />
          </button>
        </div>
        {stateError ? <p className="field-miss">{stateError}</p> : null}
        <div className="inv-status__row">
          <div>
            <p className="inv-status__name">Eliminar producto</p>
            <p>Se quita de la lista. El historial se conserva.</p>
          </div>
          <button type="button" className="btn-danger inv-status__delete" onClick={() => setAskDelete(true)}>
            Eliminar
          </button>
        </div>
        {deleteError ? <p className="field-miss">{deleteError}</p> : null}
      </section>
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={onBack}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
      {askActive ? (
        <ConfirmModal
          text={product.is_active ? "¿Inactivar este producto?" : "¿Activar este producto?"}
          confirmLabel={product.is_active ? "Sí, inactivar" : "Sí, activar"}
          closeLabel="Cancelar"
          onClose={() => setAskActive(false)}
          onConfirm={() => {
            setAskActive(false);
            setStateError("");
            void updateProduct(farmId, product.id, { is_active: !product.is_active })
              .then((fresh) => {
                onChanged(fresh);
                onNotice?.(fresh.is_active ? "Producto reactivado." : "Producto desactivado. Conserva su historial.");
              })
              .catch((cause) => {
                setStateError(cause instanceof Error ? cause.message : "No se pudo cambiar el estado");
              });
          }}
        />
      ) : null}
      {askDelete ? (
        <ConfirmModal
          text="¿Eliminar este producto? Se quita de la lista y se conserva el historial."
          confirmLabel="Sí, eliminar"
          closeLabel="Cancelar"
          onClose={() => setAskDelete(false)}
          onConfirm={() => {
            setAskDelete(false);
            setDeleteError("");
            void deleteProduct(farmId, product.id)
              .then(() => onRemoved(product.id))
              .catch((cause) => {
                setDeleteError(cause instanceof Error ? cause.message : "No se pudo eliminar");
              });
          }}
        />
      ) : null}
    </FormWindow>
  );
}

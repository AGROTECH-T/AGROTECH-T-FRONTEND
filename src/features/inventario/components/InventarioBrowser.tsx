/**
 * Listado operativo del inventario de una finca.
 *
 * Propósito: buscar, filtrar, crear y registrar varias entradas o salidas.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import type { FarmRole } from "../../farms/types/index.ts";
import { createMovement, getInventoryCatalog, getProduct } from "../services/inventoryApi.ts";
import { movementAmountMessage, normalizeAmount } from "../services/salidaAmount.ts";
import type { InventoryCatalog, MovementKind, Product } from "../types/index.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";
import { LendWindow, ReturnWindow } from "./ProductLoans.tsx";
import { ProductList } from "./ProductList.tsx";

type Props = {
  farmId: number;
  role: FarmRole;
  products: Product[];
  loading: boolean;
  error: string;
  onReload: () => void;
  onSelect: (product: Product) => void;
  onEdit: (product: Product) => void;
  onMove: (product: Product, kind: MovementKind) => void;
  onMoved: (product: Product) => void;
  desk: Desk;
  onDesk: (desk: Desk) => void;
  fresh: Product | null;
  onFreshUsed: () => void;
  onNotice?: (message: string) => void;
  catalogMark: number;
};

type Order = "name" | "quantity" | "last_movement";
type StatusFilter = "all" | "active" | "inactive" | "low";
type Desk = "entrada" | "salida" | null;

/**
 * Toolbar, alta y listado de productos.
 * @param props - Estado del inventario de la finca.
 * @returns Bloque de listado.
 */
export function InventarioBrowser({
  farmId,
  role,
  products,
  loading,
  error,
  onReload,
  onSelect,
  onEdit,
  onMove,
  onMoved,
  desk,
  onDesk,
  fresh,
  onFreshUsed,
  onNotice,
  catalogMark,
}: Readonly<Props>) {
  const canWrite = role === "administrador" || role === "operador";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [order, setOrder] = useState<Order>("name");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [amountErrors, setAmountErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [deskNote, setDeskNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loan, setLoan] = useState<{ product: Product; mode: "prestar" | "devolver" } | null>(null);
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);

  useEffect(() => {
    void getInventoryCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, [catalogMark]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = products.filter((item) => {
      if (category && item.category !== category) return false;
      if (status === "active" && !item.is_active) return false;
      if (status === "inactive" && item.is_active) return false;
      if (status === "low" && !item.is_low_stock) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) || item.barcode.toLowerCase().includes(needle)
      );
    });
    return sortProducts(rows, order);
  }, [products, query, category, status, order]);

  useEffect(() => {
    if (!fresh) return;
    onFreshUsed();
  }, [fresh, onFreshUsed]);

  const saveDesk = async () => {
    if (!desk) return;
    const rows = filtered.filter((item) => (amounts[item.id] ?? "").trim() !== "");
    if (rows.length === 0) {
      setDeskNote("Escribe la cantidad en al menos un producto.");
      return;
    }
    const next: Record<number, string> = {};
    for (const item of rows) {
      const message = movementAmountMessage(item, amounts[item.id] ?? "", desk);
      if (message) next[item.id] = message;
    }
    setAmountErrors(next);
    if (Object.keys(next).length > 0) return;
    setSaving(true);
    setDeskNote("");
    try {
      for (const item of rows) {
        await createMovement(farmId, item.id, {
          kind: desk,
          quantity: normalizeAmount(amounts[item.id] ?? ""),
          note: "",
          idempotencyKey: crypto.randomUUID(),
        });
        onMoved(await getProduct(farmId, item.id));
      }
      setAmounts({});
      setAmountErrors({});
      onDesk(null);
      onNotice?.(desk === "entrada" ? "entrada registrada" : "salida registrada");
    } catch (cause) {
      setDeskNote(cause instanceof Error ? cause.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="inv-bar">
        <label className="inv-bar__filter">
          <span className="visually-hidden">Categoría</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas las categorías</option>
            {(catalog?.categories ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inv-bar__filter">
          <span className="visually-hidden">Estado</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="low">Bajo stock</option>
          </select>
        </label>
        <label className="inventario-search">
          <span className="visually-hidden">Buscar insumo</span>
          <input
            type="search"
            placeholder="Buscar producto..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {desk && canWrite ? (
        <div className="inv-quick">
          <p className="inv-equivalence">
            {desk === "entrada" ? "Entrada" : "Salida"}: escribe la cantidad en cada producto y guarda.
          </p>
          {deskNote ? <p className="field-miss" role="alert">{deskNote}</p> : null}
          <BackButton
            onClick={() => {
              const wrote = Object.values(amounts).some((value) => value.trim() !== "");
              if (wrote) {
                setConfirmCancel(true);
                return;
              }
              onDesk(null);
            }}
          />
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveDesk()}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn-danger" onClick={() => setConfirmCancel(true)}>
            Cancelar
          </button>
        </div>
      ) : null}
      {confirmCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierden las cantidades."
          confirmLabel="Sí, cancelar"
          onConfirm={() => {
            setAmounts({});
            setAmountErrors({});
            setConfirmCancel(false);
            onDesk(null);
          }}
          onClose={() => setConfirmCancel(false)}
        />
      ) : null}

      {loading ? <p className="farm-state">Cargando inventario...</p> : null}
      {!loading && error ? (
        <div className="farm-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={onReload}>
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !error && products.length === 0 ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Aún no hay productos</p>
          <p className="inventario-empty__hint">Crea el primero con el botón de arriba.</p>
        </div>
      ) : null}
      {!loading && !error && products.length > 0 && filtered.length === 0 ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Nada coincide</p>
          <p className="inventario-empty__hint">Prueba otro nombre, código o filtro.</p>
        </div>
      ) : null}
      {!loading && !error && filtered.length > 0 ? (
        <ProductList
          products={filtered}
          role={role}
          order={order}
          onSort={setOrder}
          onView={onSelect}
          onEdit={onEdit}
          onMove={onMove}
          onLend={(product) => setLoan({ product, mode: "prestar" })}
          onReturn={(product) => setLoan({ product, mode: "devolver" })}
          desk={desk}
          amountOf={(item) => amounts[item.id] ?? ""}
          amountError={(item) => amountErrors[item.id] ?? ""}
          onAmount={(item, value) => {
            setAmounts((current) => ({ ...current, [item.id]: value }));
            setAmountErrors((current) => ({ ...current, [item.id]: "" }));
          }}
        />
      ) : null}
      {loan?.mode === "prestar" ? (
        <LendWindow
          farmId={farmId}
          product={loan.product}
          onClose={() => setLoan(null)}
          onDone={(fresh) => {
            onMoved(fresh);
            onNotice?.("préstamo registrado");
            setLoan(null);
          }}
        />
      ) : null}
      {loan?.mode === "devolver" ? (
        <ReturnWindow
          farmId={farmId}
          product={loan.product}
          onClose={() => setLoan(null)}
          onDone={(fresh) => {
            onMoved(fresh);
            onNotice?.("devolución registrada");
            setLoan(null);
          }}
        />
      ) : null}
    </>
  );
}

function sortProducts(items: Product[], order: Order): Product[] {
  const copy = [...items];
  copy.sort((left, right) => {
    if (order === "quantity") {
      const gap = Number(left.quantity) - Number(right.quantity);
      if (gap !== 0) return gap;
    }
    if (order === "last_movement") {
      const leftAt = left.last_movement_at ? Date.parse(left.last_movement_at) : 0;
      const rightAt = right.last_movement_at ? Date.parse(right.last_movement_at) : 0;
      if (leftAt !== rightAt) return rightAt - leftAt;
    }
    return left.name.localeCompare(right.name, "es");
  });
  return copy;
}

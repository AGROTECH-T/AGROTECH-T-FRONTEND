/**
 * Listado operativo del inventario de una finca.
 *
 * Propósito: buscar, filtrar, crear y registrar varias entradas o salidas.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import type { FarmRole } from "../../farms/types/index.ts";
import { inventoryIdFor } from "../services/farmInventories.ts";
import { createMovement, getInventoryCatalog, getProduct, listProducts } from "../services/inventoryApi.ts";
import { movementAmountMessage, normalizeAmount } from "../services/salidaAmount.ts";
import type { InventoryCatalog, MovementKind, Product } from "../types/index.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";
import { ListPager } from "./ListPager.tsx";
import { LendWindow, ReturnWindow } from "./ProductLoans.tsx";
import { ProductList } from "./ProductList.tsx";

type Props = {
  farmId: number;
  inventoryId: string;
  role: FarmRole;
  /** Escritura según capabilities del backend (no solo el rol). */
  canWrite: boolean;
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
  refreshMark?: number;
};

type Order = "name" | "quantity" | "last_movement";
type StatusFilter = "all" | "active" | "inactive" | "low";
type Desk = "entrada" | "salida" | null;

/**
 * Deja solo los productos del inventario abierto.
 * @param rows - Productos que devolvió la búsqueda.
 * @param farmId - Finca activa.
 * @param inventoryId - Inventario elegido, o vacío para no filtrar.
 * @returns Filas visibles.
 */
function rowsForInventory(rows: Product[], farmId: number, inventoryId: string): Product[] {
  if (!inventoryId) return rows;
  return rows.filter((item) => inventoryIdFor(farmId, item.id) === inventoryId);
}

/**
 * Toolbar, alta y listado de productos.
 * @param props - Estado del inventario de la finca.
 * @returns Bloque de listado.
 */
export function InventarioBrowser({
  farmId,
  inventoryId,
  role,
  canWrite,
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
  refreshMark = 0,
}: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [order, setOrder] = useState<Order>("name");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [count, setCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [amountErrors, setAmountErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [deskNote, setDeskNote] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loan, setLoan] = useState<{ product: Product; mode: "prestar" | "devolver" } | null>(null);
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /**
   * Deja listo el buscador para el lector USB sin abrir el teclado del teléfono.
   */
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      searchRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    void getInventoryCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, [catalogMark]);

  useEffect(() => {
    setPage(1);
  }, [farmId, inventoryId, query, category, status, order]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    void listProducts(farmId, {
      page,
      q: query.trim() || undefined,
      category: category || undefined,
      status,
      order,
    })
      .then((data) => {
        if (!alive) return;
        setProducts(rowsForInventory(data.results, farmId, inventoryId));
        setCount(data.count);
      })
      .catch((cause) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario");
        setProducts([]);
        setCount(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [farmId, inventoryId, page, query, category, status, order, fresh, tick, refreshMark]);

  useEffect(() => {
    if (!fresh) return;
    onFreshUsed();
  }, [fresh, onFreshUsed]);

  /**
   * Busca el texto escrito o escaneado y abre la ficha si coincide un solo producto.
   * @param term - Código o nombre que llegó al buscador.
   */
  const openByCode = async (term: string) => {
    const code = term.trim();
    if (!code) return;
    try {
      const data = await listProducts(farmId, {
        page: 1,
        q: code,
        category: category || undefined,
        status,
        order,
      });
      const rows = rowsForInventory(data.results, farmId, inventoryId);
      if (rows.length === 1) onSelect(rows[0]);
    } catch {
      // El listado muestra el error de la búsqueda.
    }
  };

  const saveDesk = async () => {
    if (!desk) return;
    const rows = products.filter((item) => (amounts[item.id] ?? "").trim() !== "");
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
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
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
          <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="low">Bajo stock</option>
          </select>
        </label>
        <label className="inventario-search">
          <span className="visually-hidden">Buscar insumo por nombre o código</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Buscar producto o escanear código"
            title="Escribe el nombre o el código. El lector USB escribe el código y busca con Enter."
            enterKeyHint="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void openByCode(event.currentTarget.value);
            }}
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
          <button type="button" className="btn-primary" onClick={() => setTick((current) => current + 1)}>
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !error && count === 0 ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Aún no hay productos</p>
          <p className="inventario-empty__hint">Crea el primero con el botón de arriba.</p>
        </div>
      ) : null}
      {!loading && !error && count > 0 && products.length === 0 ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Nada coincide</p>
          <p className="inventario-empty__hint">Prueba otro nombre, código o filtro.</p>
        </div>
      ) : null}
      {!loading && !error && products.length > 0 ? (
        <ProductList
          products={products}
          role={role}
          canWrite={canWrite}
          order={order}
          onSort={(next) => { setOrder(next); setPage(1); }}
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
      <ListPager page={page} count={count} onPage={setPage} one="producto" many="productos" />
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

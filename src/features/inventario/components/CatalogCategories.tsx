/**
 * Catálogo de categorías.
 *
 * Propósito: crear un grupo y marcar cómo se cuenta en él.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import { createCategory, getInventoryCatalog, removeCategory, updateCategory } from "../services/inventoryApi.ts";
import type { InventoryCatalog } from "../types/index.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";

type Props = {
  farmId: number | null;
  farms: Farm[];
  role: FarmRole;
  canWrite: boolean;
  onFarm: (farmId: number) => void;
  onCreateFarm: () => void;
  onBack: () => void;
  onNotice: (message: string) => void;
  plain?: boolean;
  onNeedCount?: () => void;
  canAdd?: boolean;
};

/**
 * Alta y listado de grupos.
 * @param props - Finca, permiso y avisos.
 * @returns Lista de grupos.
 */
export function CatalogCategories({
  farmId,
  farms,
  role,
  canWrite,
  onFarm,
  onCreateFarm,
  onBack,
  onNotice,
  plain = false,
  onNeedCount,
  canAdd = true,
}: Readonly<Props>) {
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [linked, setLinked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [askCancel, setAskCancel] = useState<"alta" | "cambio" | null>(null);
  const [gaps, setGaps] = useState<Record<string, string>>({});

  useEffect(() => {
    void getInventoryCatalog().then(setCatalog).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
    });
  }, []);

  const unitsOf = (categoryId: string) => catalog?.units_by_category[categoryId] ?? [];
  const unitLabel = (id: string) => catalog?.units.find((item) => item.id === id)?.label ?? id;
  const writable = canWrite && farmId != null;
  const units = catalog?.units ?? [];

  const cancelEdit = () => {
    const item = (catalog?.categories ?? []).find((one) => one.id === editing);
    if (item) {
      const original = unitsOf(item.id);
      const sameUnits = linked.length === original.length && linked.every((id) => original.includes(id));
      if (draft.trim() !== item.label || !sameUnits) {
        setAskCancel("cambio");
        return;
      }
    }
    setEditing(null);
  };

  const cancelNew = () => {
    if (name.trim() !== "" || picked.length > 0) {
      setAskCancel("alta");
      return;
    }
    setName("");
    setPicked([]);
    setGaps({});
    setAdding(false);
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null) return;
    if (!name.trim()) {
      setGaps({ name: "Escribe el nombre." });
      return;
    }
    setPending(true);
    setError("");
    try {
      setCatalog(await createCategory(farmId, { name: name.trim(), unit_codes: picked }));
      setName("");
      setPicked([]);
      setAdding(false);
      onNotice("categoría creada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la categoría");
    } finally {
      setPending(false);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null || !editing) return;
    const next: Record<string, string> = {};
    if (!draft.trim()) next.editName = "Escribe el nombre.";
    if (!linked.length) next.editUnits = "Toca al menos una.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      setCatalog(await updateCategory(farmId, editing, { name: draft, unit_codes: linked }));
      setEditing(null);
      onNotice("categoría actualizada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  };

  const drop = async () => {
    if (farmId == null || !pendingDelete) return;
    try {
      await removeCategory(farmId, pendingDelete.id);
      setCatalog(await getInventoryCatalog());
      setPendingDelete(null);
      onNotice("categoría borrada");
    } catch (cause) {
      setPendingDelete(null);
      setError(cause instanceof Error ? cause.message : "No se pudo borrar");
    }
  };

  return (
    <section className={plain ? undefined : "panel"} aria-labelledby="catalogo-categorias-title">
      {plain ? null : <BackButton onClick={onBack} />}
      {plain ? null : (
        <header className="panel__header">
          <h1 id="catalogo-categorias-title" className="panel__title">Categorías</h1>
          <p className="panel__lead">Sirve para agrupar. Ejemplo: Semilla.</p>
        </header>
      )}
      {plain ? null : (
        <label className="inv-farm">
          <span>Tu finca {farms.length ? `· ${roleLabel(role)}` : ""}</span>
          <select
            value={farmId ?? ""}
            onChange={(event) => {
              if (event.target.value === "crear") {
                onCreateFarm();
                return;
              }
              onFarm(Number(event.target.value));
            }}
          >
            <option value="crear">+ Crear finca</option>
            {farms.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      )}

      {error ? <p className="farm-form__error" role="alert">{error}</p> : null}

      {catalog === null ? <p className="cat-empty">Cargando el catálogo…</p> : null}
      {catalog && catalog.categories.length === 0 ? (
        <p className="cat-empty">Todavía no hay categorías. Crea la primera aquí abajo.</p>
      ) : null}

      <ul className="easy-list">
        {(catalog?.categories ?? []).map((item) => {
          const names = unitsOf(item.id).map(unitLabel);
          return (
            <li key={item.id} className="easy-card">
              {editing === item.id ? (
                <form onSubmit={(event) => void saveEdit(event)}>
                  <label className={gaps.editName ? "is-miss" : ""}>
                    <span>¿Cómo se llama?</span>
                    <input type="text" maxLength={80} value={draft} onChange={(event) => { setDraft(event.target.value); setGaps((current) => ({ ...current, editName: "" })); }} />
                    {gaps.editName ? <span className="field-miss">{gaps.editName}</span> : null}
                  </label>
                  <p>Lo que está en verde se quita al tocarlo. Tiene que quedar al menos una.</p>
                  <div className="easy-chips">
                    {linked.map((id) => (
                      <button key={id} type="button" className="easy-chip is-on" onClick={() => setLinked(linked.filter((one) => one !== id))}>
                        {unitLabel(id)} ×
                      </button>
                    ))}
                  </div>
                  {gaps.editUnits ? <span className="field-miss">{gaps.editUnits}</span> : null}
                  <label>
                    <span>Sumar otra</span>
                    <select
                      value=""
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next && !linked.includes(next)) setLinked([...linked, next]);
                      }}
                    >
                      <option value="">Escoge una</option>
                      {units.filter((unit) => !linked.includes(unit.id)).map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="easy-actions easy-actions--end">
                    <button type="button" className="btn-danger" onClick={cancelEdit}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={pending}>Guardar</button>
                  </div>
                </form>
              ) : (
                <div className="easy-card__row">
                  <h2>{item.label}</h2>
                  <div className="easy-chips">
                    {names.length ? names.slice(0, 4).map((label) => <span key={label} className="easy-chip">{label}</span>) : <span className="easy-chip">Todavía sin forma de contar</span>}
                    {names.length > 4 ? <span className="easy-chip">+{names.length - 4}</span> : null}
                  </div>
                  {writable ? (
                    <div className="easy-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setEditing(item.id);
                          setDraft(item.label);
                          setLinked(unitsOf(item.id));
                          setAdding(false);
                          setError("");
                        }}
                      >
                        Cambiar
                      </button>
                      <button type="button" className="btn-danger" onClick={() => setPendingDelete(item)}>Borrar</button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {writable && canAdd && !adding ? (
        <button type="button" className="btn-primary easy-add" onClick={() => setAdding(true)}>
          + Agregar
        </button>
      ) : null}
      {writable && canAdd && adding ? (
        <form className="easy-sheet" onSubmit={(event) => void create(event)}>
          <h2>Nueva categoría</h2>
          <label className={gaps.name ? "is-miss" : ""}>
            <span>¿Cómo se llama la categoría? Ahí va semilla, abono o herramienta.</span>
            <input
              type="text"
              maxLength={80}
              placeholder="Semilla"
              value={name}
              onChange={(event) => { setName(event.target.value); setGaps({}); }}
              disabled={pending}
            />
            {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
          </label>
          <p>¿Qué formas de contar van aquí? Toca bulto, kilo o caja. El verde queda. Se pueden tocar varias.</p>
          {units.length === 0 ? (
            <p className="easy-hint">
              Todavía no hay ninguna.{" "}
              {onNeedCount ? (
                <button type="button" className="text-link" onClick={onNeedCount}>Créala en ¿Cómo lo cuentas?</button>
              ) : "Créala en ¿Cómo lo cuentas?"}
            </p>
          ) : (
            <div className="easy-chips">
              {units.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={picked.includes(item.id) ? "easy-chip is-on" : "easy-chip"}
                  onClick={() => setPicked((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                >
                  {picked.includes(item.id) ? "✓ " : ""}{item.label}
                </button>
              ))}
            </div>
          )}
          <div className="easy-actions easy-actions--end">
            <button type="button" className="btn-danger" onClick={cancelNew} disabled={pending}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>Guardar</button>
          </div>
        </form>
      ) : null}
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          closeLabel="Cancelar"
          onConfirm={() => {
            if (askCancel === "alta") {
              setAdding(false);
              setName("");
              setPicked([]);
            } else setEditing(null);
            setAskCancel(null);
          }}
          onClose={() => setAskCancel(null)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          text={`¿Borrar ${pendingDelete.label}? Si ya está en un producto, no se puede.`}
          confirmLabel="Sí, borrar"
          closeLabel="Cancelar"
          onConfirm={() => void drop()}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}

/**
 * Catálogo de unidades.
 *
 * Propósito: crear, cambiar y borrar unidades, y decir en qué categorías viven.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import {
  createCustomUnit,
  getInventoryCatalog,
  removeUnit,
  updateUnit,
} from "../services/inventoryApi.ts";
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
  onMeasures: () => void;
  onGroups?: () => void;
  onNotice: (message: string) => void;
  plain?: boolean;
  canAdd?: boolean;
};

/**
 * Alta y listado de unidades en la misma pantalla.
 * @param props - Finca, permiso y avisos.
 * @returns Catálogo de unidades.
 */
export function CatalogUnits({
  farmId,
  farms,
  role,
  canWrite,
  onFarm,
  onCreateFarm,
  onBack,
  onMeasures,
  onGroups,
  onNotice,
  plain = false,
  canAdd = true,
}: Readonly<Props>) {
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [label, setLabel] = useState("");
  const [base, setBase] = useState("u");
  const [factor, setFactor] = useState("1");
  const [categories, setCategories] = useState<string[]>([]);
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

  const writable = canWrite && farmId != null;
  const categoriesOf = (unitId: string) =>
    (catalog?.categories ?? []).filter((item) => (catalog?.units_by_category[item.id] ?? []).includes(unitId));

  const cancelEdit = () => {
    const item = (catalog?.units ?? []).find((one) => one.id === editing);
    if (item) {
      const original = categoriesOf(item.id).map((category) => category.id);
      const sameCategories =
        linked.length === original.length && linked.every((id) => original.includes(id));
      if (draft.trim() !== item.label || !sameCategories) {
        setAskCancel("cambio");
        return;
      }
    }
    setEditing(null);
  };

  const cancelNew = () => {
    if (label.trim() !== "" || factor !== "1" || categories.length > 0) {
      setAskCancel("alta");
      return;
    }
    setLabel("");
    setFactor("1");
    setCategories([]);
    setGaps({});
    setAdding(false);
  };

  const toggle = (id: string, current: string[], set: (next: string[]) => void) => {
    set(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null) return;
    const next: Record<string, string> = {};
    if (!label.trim()) next.name = "Escribe el nombre.";
    if (!factor.trim()) next.factor = "Escribe el número.";
    if (!categories.length) next.categories = "Elige al menos una.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      await createCustomUnit(farmId, {
        stem: label.trim(),
        label: label.trim(),
        base_unit: base,
        factor: factor.trim() || "1",
        categories,
      });
      setCatalog(await getInventoryCatalog());
      setLabel("");
      setFactor("1");
      setCategories([]);
      setAdding(false);
      onNotice("unidad creada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la unidad");
    } finally {
      setPending(false);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null || !editing) return;
    const next: Record<string, string> = {};
    if (!draft.trim()) next.editName = "Escribe el nombre.";
    if (!linked.length) next.editCategories = "Elige al menos una.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      setCatalog(await updateUnit(farmId, editing, { label: draft, categories: linked }));
      setEditing(null);
      onNotice("unidad actualizada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  };

  const drop = async () => {
    if (farmId == null || !pendingDelete) return;
    try {
      await removeUnit(farmId, pendingDelete.id);
      setCatalog(await getInventoryCatalog());
      setPendingDelete(null);
      onNotice("unidad borrada");
    } catch (cause) {
      setPendingDelete(null);
      setError(cause instanceof Error ? cause.message : "No se pudo borrar");
    }
  };

  return (
    <section className={plain ? undefined : "panel"} aria-labelledby="catalogo-unidades-title">
      {plain ? null : <BackButton onClick={onBack} />}
      {plain ? null : (
        <header className="panel__header">
          <h1 id="catalogo-unidades-title" className="panel__title">Unidades</h1>
          <p className="panel__lead">Sirve para contar. Ejemplo: bulto o kilo.</p>
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
      {catalog && catalog.units.length === 0 ? (
        <p className="cat-empty">Todavía no hay formas de contar. Crea la primera aquí abajo.</p>
      ) : null}

      <ul className="easy-list">
        {(catalog?.units ?? []).map((item) => (
          <li key={item.id} className="easy-card">
            {editing === item.id ? (
              <form onSubmit={(event) => void saveEdit(event)}>
                <label className={gaps.editName ? "is-miss" : ""}>
                  <span>¿Cómo se llama?</span>
                  <input type="text" maxLength={80} value={draft} onChange={(event) => { setDraft(event.target.value); setGaps((current) => ({ ...current, editName: "" })); }} />
                  {gaps.editName ? <span className="field-miss">{gaps.editName}</span> : null}
                </label>
                <p className="easy-hint">
                  {item.equivalent ? `Son ${item.equivalent}.` : "Es la medida suelta."} El número y la medida no se cambian.
                </p>
                <p>¿En qué categoría va? Toca para marcar o quitar. El verde queda.</p>
                <div className="easy-chips">
                  {(catalog?.categories ?? []).map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={linked.includes(category.id) ? "easy-chip is-on" : "easy-chip"}
                      onClick={() => toggle(category.id, linked, setLinked)}
                    >
                      {linked.includes(category.id) ? "✓ " : ""}{category.label}
                    </button>
                  ))}
                </div>
                {gaps.editCategories ? <span className="field-miss">{gaps.editCategories}</span> : null}
                <div className="easy-actions">
                  <button type="button" className="btn-danger" onClick={cancelEdit}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={pending}>Listo, guardar</button>
                </div>
              </form>
            ) : (
              <div className="easy-card__row">
                <h2>{item.label}</h2>
                <p className="easy-hint">{item.equivalent ? `Son ${item.equivalent}.` : "Es la medida suelta."}</p>
                <div className="easy-chips">
                  {categoriesOf(item.id).length
                    ? categoriesOf(item.id).map((category) => <span key={category.id} className="easy-chip">{category.label}</span>)
                    : <span className="easy-chip">Todavía sin categoría</span>}
                </div>
                {writable ? (
                  <div className="easy-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditing(item.id);
                        setDraft(item.label);
                        setLinked(categoriesOf(item.id).map((category) => category.id));
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
        ))}
      </ul>
      {writable && canAdd && !adding ? (
        <button type="button" className="btn-primary easy-add" onClick={() => setAdding(true)}>
          + Agregar
        </button>
      ) : null}
      {writable && canAdd && adding ? (
        <form className="easy-sheet" onSubmit={(event) => void create(event)}>
          <h2>Nueva forma de contar</h2>
          <label className={gaps.name ? "is-miss" : ""}>
            <span>¿Cómo lo llamas al sacarlo? Ahí va bulto, caja o caneca. Si sale suelto, va kilo.</span>
            <input
              type="text"
              maxLength={80}
              placeholder="Bulto"
              value={label}
              onChange={(event) => { setLabel(event.target.value); setGaps((current) => ({ ...current, name: "" })); }}
              disabled={pending}
            />
            {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
          </label>
          <label>
            <span>¿De qué medida sale?</span>
            <select value={base} onChange={(event) => setBase(event.target.value)} disabled={pending}>
              {(catalog?.base_units ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
          <p className="easy-hint">
            Si no está,{" "}
            <button type="button" className="text-link" onClick={onMeasures}>agrégala en ¿Con qué mides?</button>
          </p>
          <label className={gaps.factor ? "is-miss" : ""}>
            <span>¿Cuántos lleva? Si es el kilo suelto, escribe 1. Si el bulto trae 50 kilos, escribe 50.</span>
            <input value={factor} inputMode="decimal" onChange={(event) => { setFactor(event.target.value); setGaps((current) => ({ ...current, factor: "" })); }} disabled={pending} />
            {gaps.factor ? <span className="field-miss">{gaps.factor}</span> : null}
          </label>
          <p>¿En qué categoría va? Toca la categoría y queda en verde. Hace falta al menos una.</p>
          {(catalog?.categories ?? []).length === 0 ? (
            <p className="easy-hint">
              Todavía no hay categoría.{" "}
              {onGroups ? (
                <button type="button" className="text-link" onClick={onGroups}>Créala en ¿En qué categoría va? y vuelve.</button>
              ) : null}
            </p>
          ) : (
            <div className="easy-chips">
              {(catalog?.categories ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={categories.includes(item.id) ? "easy-chip is-on" : "easy-chip"}
                  onClick={() => toggle(item.id, categories, setCategories)}
                >
                  {categories.includes(item.id) ? "✓ " : ""}{item.label}
                </button>
              ))}
            </div>
          )}
          {gaps.categories ? <span className="field-miss">{gaps.categories}</span> : null}
          <div className="easy-actions easy-actions--end">
            <button type="button" className="btn-danger" onClick={cancelNew} disabled={pending}>Cancelar</button>
            <button type="submit" className="btn-primary inv-save" disabled={pending}>Guardar</button>
          </div>
        </form>
      ) : null}
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={() => {
            if (askCancel === "alta") {
              setAdding(false);
              setLabel("");
              setFactor("1");
              setCategories([]);
              setGaps({});
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
          onConfirm={() => void drop()}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}

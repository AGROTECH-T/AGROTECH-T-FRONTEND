/**
 * Catálogo de medidas.
 *
 * Propósito: ver, crear, cambiar y borrar las medidas.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import { createBaseUnit, getInventoryCatalog, removeBaseUnit, updateBaseUnit } from "../services/inventoryApi.ts";
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
  canAdd?: boolean;
};

/**
 * Lista de medidas y alta en la misma pantalla.
 * @param props - Finca, permiso y avisos.
 * @returns Catálogo de medidas.
 */
export function CatalogMeasures({
  farmId,
  farms,
  role,
  canWrite,
  onFarm,
  onCreateFarm,
  onBack,
  onNotice,
  plain = false,
  canAdd = true,
}: Readonly<Props>) {
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [editDecimals, setEditDecimals] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [askCancel, setAskCancel] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [gaps, setGaps] = useState<Record<string, string>>({});
  const writable = canWrite && farmId != null;

  const cancelNew = () => {
    if (name.trim() !== "" || symbol.trim() !== "" || decimals) {
      setAskCancel(true);
      return;
    }
    setName("");
    setSymbol("");
    setDecimals(false);
    setGaps({});
    setAdding(false);
  };

  useEffect(() => {
    void getInventoryCatalog().then(setCatalog).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
    });
  }, []);

  const drop = async () => {
    if (farmId == null || !pendingDelete) return;
    try {
      await removeBaseUnit(farmId, pendingDelete.id);
      setCatalog(await getInventoryCatalog());
      setPendingDelete(null);
      onNotice("medida borrada");
    } catch (cause) {
      setPendingDelete(null);
      setError(cause instanceof Error ? cause.message : "No se pudo borrar");
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Escribe el nombre.";
    if (!symbol.trim()) next.symbol = "Escribe el símbolo.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      setCatalog(await createBaseUnit(farmId, {
        name: name.trim(),
        symbol: symbol.trim(),
        decimals,
      }));
      setName("");
      setSymbol("");
      setDecimals(false);
      setAdding(false);
      onNotice("medida creada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la medida");
    } finally {
      setPending(false);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (farmId == null || !editing) return;
    const next: Record<string, string> = {};
    if (!editName.trim()) next.editName = "Escribe el nombre.";
    if (!editSymbol.trim()) next.editSymbol = "Escribe el símbolo.";
    setGaps(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError("");
    try {
      setCatalog(await updateBaseUnit(farmId, editing, {
        name: editName.trim(),
        symbol: editSymbol.trim(),
        decimals: editDecimals,
      }));
      setEditing(null);
      onNotice("medida actualizada");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={plain ? undefined : "panel"} aria-labelledby="catalogo-medidas-title">
      {plain ? null : <BackButton onClick={onBack} />}
      {plain ? null : (
        <header className="panel__header">
          <h1 id="catalogo-medidas-title" className="panel__title">Medidas</h1>
          <p className="panel__lead">Kilo, litro y unidad ya están. Crea una solo si falta.</p>
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
      {catalog && (catalog.base_units ?? []).length === 0 ? (
        <p className="cat-empty">Todavía no hay medidas. Crea la primera aquí abajo.</p>
      ) : null}

      <ul className="easy-list">
        {(catalog?.base_units ?? []).map((item) => (
          <li key={item.id} className="easy-card">
            {editing === item.id ? (
              <form onSubmit={(event) => void saveEdit(event)}>
                <label className={gaps.editName ? "is-miss" : ""}>
                  <span>¿Cómo se llama? Ahí va kilo, litro o unidad.</span>
                  <input value={editName} maxLength={60} placeholder="Kilo" onChange={(event) => { setEditName(event.target.value); setGaps((current) => ({ ...current, editName: "" })); }} />
                  {gaps.editName ? <span className="field-miss">{gaps.editName}</span> : null}
                </label>
                <label className={gaps.editSymbol ? "is-miss" : ""}>
                  <span>¿Qué se escribe al lado del número? Ahí va kg, L o u.</span>
                  <input value={editSymbol} maxLength={10} placeholder="kg" onChange={(event) => { setEditSymbol(event.target.value); setGaps((current) => ({ ...current, editSymbol: "" })); }} />
                  {gaps.editSymbol ? <span className="field-miss">{gaps.editSymbol}</span> : null}
                </label>
                <div className="easy-chips">
                  <button type="button" className={editDecimals ? "easy-chip" : "easy-chip is-on"} onClick={() => setEditDecimals(false)}>
                    {editDecimals ? "" : "✓ "}Número entero
                  </button>
                  <button type="button" className={editDecimals ? "easy-chip is-on" : "easy-chip"} onClick={() => setEditDecimals(true)}>
                    {editDecimals ? "✓ " : ""}Permite decimales
                  </button>
                </div>
                <div className="easy-actions easy-actions--end">
                  <button type="button" className="btn-danger" onClick={() => setEditing(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={pending}>Guardar</button>
                </div>
              </form>
            ) : (
              <div className="easy-card__row">
                <h2>{item.label}</h2>
                <p className="easy-hint">{item.nature === "continua" ? "Permite decimales." : "Número entero."}</p>
                {writable ? (
                  <div className="easy-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditing(item.id);
                        setEditName(item.name || item.label);
                        setEditSymbol(item.symbol || "");
                        setEditDecimals(item.nature === "continua");
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
          <h2>Nueva medida</h2>
          <label className={gaps.name ? "is-miss" : ""}>
            <span>¿Cómo se llama? Ahí va kilo, litro o unidad.</span>
            <input
              value={name}
              maxLength={60}
              placeholder="Kilo"
              onChange={(event) => { setName(event.target.value); setGaps((current) => ({ ...current, name: "" })); }}
              disabled={pending}
            />
            {gaps.name ? <span className="field-miss">{gaps.name}</span> : null}
          </label>
          <label className={gaps.symbol ? "is-miss" : ""}>
            <span>¿Qué se escribe al lado del número? Ahí va kg, L o u.</span>
            <input
              value={symbol}
              maxLength={10}
              placeholder="kg"
              onChange={(event) => { setSymbol(event.target.value); setGaps((current) => ({ ...current, symbol: "" })); }}
              disabled={pending}
            />
            {gaps.symbol ? <span className="field-miss">{gaps.symbol}</span> : null}
          </label>
          <div className="easy-chips">
            <button type="button" className={decimals ? "easy-chip" : "easy-chip is-on"} onClick={() => setDecimals(false)}>
              {decimals ? "" : "✓ "}Número entero
            </button>
            <button type="button" className={decimals ? "easy-chip is-on" : "easy-chip"} onClick={() => setDecimals(true)}>
              {decimals ? "✓ " : ""}Permite decimales
            </button>
          </div>
          <div className="easy-actions easy-actions--end">
            <button type="button" className="btn-danger" disabled={pending} onClick={cancelNew}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={pending}>Guardar</button>
          </div>
        </form>
      ) : null}
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={() => {
            setName("");
            setSymbol("");
            setDecimals(false);
            setGaps({});
            setAdding(false);
            setAskCancel(false);
          }}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          text={`¿Borrar ${pendingDelete.label}? Si ya se usa para contar, no se puede.`}
          confirmLabel="Sí, borrar"
          closeLabel="Cancelar"
          onConfirm={() => void drop()}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}

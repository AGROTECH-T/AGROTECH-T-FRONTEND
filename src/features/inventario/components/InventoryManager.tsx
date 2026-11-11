/**
 * Inventarios de una finca.
 *
 * Propósito: crear, renombrar, borrar y abrir cada inventario en la misma pantalla.
 * Contexto: una finca puede tener varios; el principal no se puede dejar sola.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import {
  addInventory,
  listInventories,
  removeInventory,
  renameInventory,
  type FarmInventory,
} from "../services/farmInventories.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { ConfirmModal } from "./ConfirmModal.tsx";

type Props = {
  farmId: number;
  farms: Farm[];
  role: FarmRole;
  canWrite: boolean;
  onFarm: (farmId: number) => void;
  onCreateFarm: () => void;
  onOpen: (inventoryId: string) => void;
  onCreated: (inventoryId: string) => void;
  onChanged: (message: string) => void;
  onBack: () => void;
};

/**
 * Alta y listado de inventarios, juntos.
 * @param props - Finca, permisos y avisos hacia el panel.
 * @returns Pantalla única de inventarios.
 */
export function InventoryManager({
  farmId,
  farms,
  role,
  canWrite,
  onFarm,
  onCreateFarm,
  onOpen,
  onCreated,
  onChanged,
  onBack,
}: Readonly<Props>) {
  const [items, setItems] = useState<FarmInventory[]>(() => listInventories(farmId));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FarmInventory | null>(null);
  const [askBack, setAskBack] = useState(false);

  useEffect(() => {
    setItems(listInventories(farmId));
    setEditing(null);
    setName("");
    setError("");
  }, [farmId]);

  const reload = () => setItems(listInventories(farmId));

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      renameInventory(editing, draft);
      setEditing(null);
      reload();
      onChanged("inventario actualizado");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo renombrar");
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setError("Escribe el nombre.");
      return;
    }
    try {
      const created = addInventory(farmId, clean);
      setName("");
      setError("");
      reload();
      onCreated(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el inventario");
    }
  };

  const drop = () => {
    if (!pendingDelete) return;
    try {
      removeInventory(farmId, pendingDelete.id);
      setPendingDelete(null);
      reload();
      onChanged("inventario borrado");
    } catch (cause) {
      setPendingDelete(null);
      setError(cause instanceof Error ? cause.message : "No se pudo borrar");
    }
  };

  return (
    <section className="panel" aria-labelledby="inventarios-title">
      <BackButton onClick={() => (name.trim() ? setAskBack(true) : onBack())} />
      <header className="panel__header">
        <h1 id="inventarios-title" className="panel__title">Inventarios</h1>
        <p className="panel__lead">Una finca puede tener varios inventarios. Cada producto vive en uno.</p>
      </header>
      <label className="inv-farm">
        <span>Finca {`· ${roleLabel(role)}`}</span>
        <select
          value={farmId}
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
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      {canWrite ? (
        <form className="inv-book-create" onSubmit={create} noValidate>
          <label className={!editing && error ? "is-miss" : ""}>
            <span>Nuevo inventario</span>
            <input
              type="text"
              maxLength={100}
              placeholder="Ejemplo: Bodega"
              value={name}
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
            {!editing && error ? <span className="field-miss">{error}</span> : null}
          </label>
          <button type="submit" className="btn-primary inv-save">Guardar</button>
        </form>
      ) : null}

      <ul className="farm-list">
        {items.map((item) => (
          <li key={item.id} className="inv-book">
            {editing === item.id ? (
              <form className="inv-book__edit" onSubmit={saveName}>
                <input
                  type="text"
                  maxLength={100}
                  value={draft}
                  onChange={(event) => { setDraft(event.target.value); setError(""); }}
                />
                {error ? <span className="field-miss">{error}</span> : null}
                <button type="submit" className="btn-primary">Guardar</button>
                <button type="button" className="btn-danger" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <button type="button" className="farm-row" onClick={() => onOpen(item.id)}>
                  <span className="farm-row__name">{item.name}</span>
                </button>
                {canWrite ? (
                  <div className="inv-book__actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditing(item.id);
                        setDraft(item.name);
                        setError("");
                      }}
                    >
                      Renombrar
                    </button>
                    <button type="button" className="btn-danger" onClick={() => setPendingDelete(item)}>
                      Borrar
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      {askBack ? (
        <ConfirmModal
          text="¿Volver atrás? Se pierde el nombre escrito."
          confirmLabel="Sí, volver"
          onConfirm={() => {
            setAskBack(false);
            onBack();
          }}
          onClose={() => setAskBack(false)}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmModal
          text={`¿Borrar ${pendingDelete.name}? Sus productos pasan al otro inventario.`}
          confirmLabel="Sí, borrar"
          onConfirm={drop}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}

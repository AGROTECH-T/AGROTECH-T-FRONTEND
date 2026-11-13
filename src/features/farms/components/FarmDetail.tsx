/**
 * Detalle de una finca.
 *
 * Propósito: consultar, y si es admin editar o eliminar.
 * Contexto: PUT/DELETE solo para rol administrador.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { deleteFarm, updateFarm } from "../services/farmsApi.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type { Farm } from "../types/index.ts";

type Props = {
  farm: Farm;
  onBack: () => void;
  onUpdated: (farm: Farm) => void;
  onDeleted: (farmId: number) => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function validateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Escribe el nombre de la finca.";
  if (trimmed.length > 100) return "Máximo 100 caracteres.";
  return "";
}

/**
 * Ficha de una finca con edición y borrado para administrador.
 */
export function FarmDetail({
  farm,
  onBack,
  onUpdated,
  onDeleted,
}: Readonly<Props>) {
  const isAdmin = farm.role === "administrador";
  const [name, setName] = useState(farm.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [gap, setGap] = useState("");

  useEffect(() => {
    setName(farm.name);
    setError("");
    setGap("");
  }, [farm.id, farm.name]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const message = validateName(name);
    setGap(message);
    if (message) return;

    setPending(true);
    setError("");
    try {
      const updated = await updateFarm(farm.id, name.trim());
      onUpdated(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    const ok = window.confirm(`¿Eliminar la finca "${farm.name}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setPending(true);
    setError("");
    try {
      await deleteFarm(farm.id);
      onDeleted(farm.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar");
      setPending(false);
    }
  }

  return (
    <section className="farm-detail" aria-labelledby="farm-detail-title">
      <BackButton onClick={onBack} disabled={pending} />

      <header className="panel__header">
        <h2 id="farm-detail-title" className="panel__title">
          {farm.name}
        </h2>
        <p className="panel__lead">Tu rol en esta finca: {roleLabel(farm.role)}</p>
      </header>

      <dl className="farm-detail__meta">
        <div>
          <dt>Identificador</dt>
          <dd>{farm.id}</dd>
        </div>
        <div>
          <dt>Creada</dt>
          <dd>{formatDate(farm.created_at)}</dd>
        </div>
        <div>
          <dt>Actualizada</dt>
          <dd>{formatDate(farm.updated_at)}</dd>
        </div>
      </dl>

      {isAdmin ? (
        <form className="farm-form" onSubmit={(event) => void save(event)} noValidate>
          <h3 className="farm-form__title">Editar nombre</h3>
          <label className="farm-form__field">
            Nombre
            <input
              type="text"
              name="name"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              autoComplete="off"
            />
          </label>
          {gap ? <span className="farm-form__gap">{gap}</span> : null}
          {error ? (
            <p className="farm-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="farm-form__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void remove()}
              disabled={pending}
            >
              Eliminar
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}

      {!isAdmin && error ? (
        <p className="farm-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

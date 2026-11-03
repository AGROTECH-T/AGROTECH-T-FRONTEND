/**
 * Formulario para crear una finca.
 *
 * Propósito: pedir solo el nombre y enviarlo a la API.
 * Contexto: Farms v1; el creador queda como administrador.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type FormEvent } from "react";
import { createFarm } from "../services/farmsApi.ts";
import type { Farm } from "../types/index.ts";

type Props = {
  onCreated: (farm: Farm) => void;
  onCancel: () => void;
};

/**
 * Valida el nombre en cliente (mismo criterio básico que el backend).
 * @param name - Texto escrito.
 * @returns Aviso o cadena vacía.
 */
function nameMessage(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Escribe el nombre de la finca.";
  if (trimmed.length > 100) return "El nombre no puede superar 100 caracteres.";
  return "";
}

/**
 * Alta de finca con un solo campo.
 * @param props - Callbacks de creación y cancelación.
 * @returns Formulario neomórfico.
 */
export function FarmCreateForm({ onCreated, onCancel }: Readonly<Props>) {
  const [name, setName] = useState("");
  const [gap, setGap] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = nameMessage(name);
    setGap(message);
    setError("");
    if (message) return;

    setPending(true);
    try {
      onCreated(await createFarm(name.trim()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la finca");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="farm-form" onSubmit={(event) => void submit(event)} noValidate>
      <h2 className="farm-form__title">Nueva finca</h2>
      <label className="farm-form__field">
        <span>Nombre</span>
        <input
          type="text"
          name="name"
          maxLength={100}
          placeholder="Ejemplo: La Esperanza"
          value={name}
          autoComplete="off"
          disabled={pending}
          onChange={(event) => {
            setName(event.target.value);
            setGap("");
          }}
        />
        {gap ? <span className="farm-form__gap">{gap}</span> : null}
      </label>
      {error ? (
        <p className="farm-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="farm-form__actions">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creando..." : "Crear finca"}
        </button>
      </div>
    </form>
  );
}

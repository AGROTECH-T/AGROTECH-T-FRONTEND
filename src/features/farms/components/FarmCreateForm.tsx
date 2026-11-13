/**
 * Formulario para crear una finca.
 *
 * Propósito: pedir solo el nombre y enviarlo a la API.
 * Contexto: Farms v1; el creador queda como administrador. Se usa en Fincas y
 * en el onboarding (F10.2). Un candado impide enviar dos veces a la vez.
 * @author Cristian Deysdayr Jimenez
 */

import { useRef, useState, type FormEvent } from "react";
import { createSubmitGuard } from "../../../components/ui/ConfirmDialog.tsx";
import { NAME_MAX_LENGTH, nameMessage, runFarmCreation } from "../services/farmCreation.ts";
import { createFarm } from "../services/farmsApi.ts";
import type { Farm } from "../types/index.ts";

type Props = {
  onCreated: (farm: Farm) => void;
  onCancel: () => void;
  /** Título visible (por defecto "Nueva finca"). */
  title?: string;
  /** Texto del botón secundario (por defecto "Cancelar"). */
  cancelLabel?: string;
  /** Llamada HTTP (inyectable en pruebas). */
  create?: (name: string) => Promise<Farm>;
};

/**
 * Alta de finca con un solo campo.
 * @param props - Callbacks de creación y cancelación.
 * @returns Formulario neomórfico.
 */
export function FarmCreateForm({
  onCreated,
  onCancel,
  title = "Nueva finca",
  cancelLabel = "Cancelar",
  create = createFarm,
}: Readonly<Props>) {
  const [name, setName] = useState("");
  const [gap, setGap] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const guard = useRef(createSubmitGuard());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const message = nameMessage(name);
    setGap(message);
    setError("");
    if (message) return;

    await guard.current(async () => {
      setPending(true);
      const result = await runFarmCreation(name, create);
      setPending(false);
      if (result.kind === "created") onCreated(result.farm);
      else if (result.kind === "invalid") setGap(result.message);
      else setError(result.message);
    });
  };

  return (
    <form className="farm-form" onSubmit={(event) => void submit(event)} noValidate>
      <h2 className="farm-form__title">{title}</h2>
      <label className="farm-form__field">
        <span>Nombre</span>
        <input
          type="text"
          name="name"
          maxLength={NAME_MAX_LENGTH}
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
          {cancelLabel}
        </button>
        <button type="submit" className="btn-primary" disabled={pending} aria-busy={pending}>
          {pending ? "Creando..." : "Crear finca"}
        </button>
      </div>
    </form>
  );
}

/**
 * Formulario para crear una finca.
 *
 * Propósito: pedir solo el nombre y enviarlo a la API.
 * Contexto: Farms v1; el creador queda como administrador. Se usa en Fincas y
 * en el onboarding (F10.2). Un candado impide enviar dos veces a la vez.
 * INT-02: en Fincas se abre en una ventana (FormWindow, ``inWindow``) y pide
 * confirmación antes de descartar un nombre escrito; el onboarding lo usa en línea.
 * @author Cristian Deysdayr Jimenez
 */

import { useRef, useState, type FormEvent } from "react";
import { createSubmitGuard } from "../../../components/ui/ConfirmDialog.tsx";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import {
  NAME_MAX_LENGTH,
  nameMessage,
  runFarmCreation,
} from "../services/farmCreation.ts";
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
  /** Mostrar dentro de una ventana (Fincas). El onboarding lo usa en línea. */
  inWindow?: boolean;
};

/**
 * Alta de finca con un solo campo.
 * @param props - Callbacks de creación y cancelación.
 * @returns Formulario neomórfico dentro de una ventana.
 */
export function FarmCreateForm({
  onCreated,
  onCancel,
  title = "Nueva finca",
  cancelLabel = "Cancelar",
  create = createFarm,
  inWindow = false,
}: Readonly<Props>) {
  const [name, setName] = useState("");
  const [gap, setGap] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const guard = useRef(createSubmitGuard());

  const leave = () => {
    if (name.trim()) {
      setAskCancel(true);
      return;
    }
    onCancel();
  };

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

  const form = (
    <form
      className="farm-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      {inWindow ? null : <h2 className="farm-form__title">{title}</h2>}
      <div className="farm-form__block">
        <label className={gap ? "farm-form__field is-miss" : "farm-form__field"}>
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
      </div>
      {error ? (
        <p className="farm-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="farm-form__actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={leave}
          disabled={pending}
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Creando..." : "Crear finca"}
        </button>
      </div>
      {askCancel ? (
        <ConfirmModal
          text="¿Cancelar? Se pierde lo escrito."
          confirmLabel="Sí, cancelar"
          onConfirm={onCancel}
          onClose={() => setAskCancel(false)}
        />
      ) : null}
    </form>
  );

  return inWindow ? (
    <FormWindow title={title} onClose={leave}>
      {form}
    </FormWindow>
  ) : (
    form
  );
}

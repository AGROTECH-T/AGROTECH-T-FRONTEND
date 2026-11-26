/**
 * Formulario de unión a una finca con código de invitación (F10.3.5).
 *
 * Propósito: escribir el código, previsualizar finca, rol y vencimiento,
 * confirmar y aceptar, con el resultado real del backend.
 * Contexto: lo usan la bienvenida («Entrar como invitado») y Fincas
 * («Unirme a una finca»). La aceptación nunca es automática: siempre hay una
 * previsualización y una confirmación explícita. El código solo vive en el
 * estado de este componente (nunca en sessionStorage ni localStorage) y cada
 * acción tiene como mucho una solicitud en vuelo.
 * @author Cristian Deysdayr Jimenez
 */

import { CharLeft } from "../../../components/ui/CharLeft.tsx";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import "../../../styles/invitation-code.css";
import { acceptInvitationCode, previewInvitationCode } from "../services/codeApi.ts";
import {
  CODE_MAX_LENGTH,
  createCodeRunner,
  previewSummary,
  type CodeApi,
  type CodeError,
  type CodeRunner,
  type CodeStep,
} from "../services/codeFlow.ts";
import type { InvitationAcceptResult, InvitationCodePreview } from "../types/index.ts";

const DEFAULT_API: CodeApi = { preview: previewInvitationCode, accept: acceptInvitationCode };

type Texts = {
  title: string;
  intro?: string;
  hint?: string;
  cancelLabel?: string;
};

type ViewProps = Texts & {
  step: CodeStep;
  code: string;
  preview: InvitationCodePreview | null;
  error: CodeError | null;
  joinedMessage?: string;
  hideTitle?: boolean;
  onCodeChange: (value: string) => void;
  onPreview: () => void;
  onConfirm: () => void;
  onBack: () => void;
  onCancel?: () => void;
};

/**
 * Vista sin efectos del formulario (útil para pruebas estáticas).
 * @param props - Paso, código en memoria, previsualización, error y acciones.
 */
export function InvitationCodeView(props: Readonly<ViewProps>) {
  const {
    step,
    code,
    preview,
    error,
    title,
    intro,
    hint,
    cancelLabel = "Cancelar",
    hideTitle = false,
  } = props;
  const busy = step === "checking" || step === "accepting";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === "enter") props.onPreview();
  };
  const summary = preview ? previewSummary(preview) : null;
  return (
    <form className="farm-form invite-code" data-code-step={step} onSubmit={submit} noValidate>
      <header className="invite-code__head">
        {hideTitle ? null : <h2 className="farm-form__title invite-code__title">{title}</h2>}
        {intro ? <p className="invite-code__intro">{intro}</p> : null}
      </header>

      {step === "enter" || step === "checking" ? (
        <div className="farm-form__block invite-code__block">
          <label className="farm-form__field">
            <span>Código de invitación</span>
            <input
              type="text"
              name="invitation-code"
              maxLength={CODE_MAX_LENGTH}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Ejemplo: ABCDE-23456"
              value={code}
              disabled={busy}
              onChange={(event) => props.onCodeChange(event.target.value)}
            />
            <CharLeft value={code} max={CODE_MAX_LENGTH} />
          </label>
        </div>
      ) : null}

      {summary && (step === "confirm" || step === "accepting") ? (
        <div className="invite-code__preview" data-code-preview="">
          <p className="invite-code__lead">Revisa la invitación antes de unirte:</p>
          <dl>
            <dt>Finca</dt>
            <dd data-field="farm">{summary.farm}</dd>
            <dt>Rol</dt>
            <dd data-field="role">{summary.role}</dd>
            <dt>Vence</dt>
            <dd data-field="expires">{summary.expires}</dd>
          </dl>
        </div>
      ) : null}

      {step === "joined" && props.joinedMessage ? (
        <p className="invite-message is-ok" role="status" data-code-joined="">
          {props.joinedMessage}
        </p>
      ) : null}

      {error ? (
        <p className="invite-message is-warn" role="alert" data-code-error={error.kind}>
          {error.message}
        </p>
      ) : null}

      {hint && (step === "enter" || step === "checking") ? (
        <p className="invite-code__hint">{hint}</p>
      ) : null}

      {step !== "joined" ? (
        <div className="farm-form__actions invite-code__actions">
          {step === "confirm" || step === "accepting" ? (
            <>
              <button type="button" className="btn-secondary" disabled={busy} onClick={props.onBack}>
                Cambiar código
              </button>
              <button type="button" className="btn-primary invite-code__go" disabled={busy} onClick={props.onConfirm}>
                {step === "accepting" ? "Uniéndote..." : "Unirme a la finca"}
              </button>
            </>
          ) : (
            <>
              {props.onCancel ? (
                <button type="button" className="btn-secondary" disabled={busy} onClick={props.onCancel}>
                  {cancelLabel}
                </button>
              ) : null}
              <button type="submit" className="btn-primary invite-code__go" disabled={busy}>
                {step === "checking" ? "Comprobando..." : "Continuar"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}

type Props = Texts & {
  /** Se llama una sola vez cuando el backend confirma la membresía. */
  onAccepted: (result: InvitationAcceptResult, preview: InvitationCodePreview) => void;
  onCancel?: () => void;
  /** Mensaje que se muestra tras unirse (lo decide quien usa el formulario). */
  joinedMessage?: (result: InvitationAcceptResult, preview: InvitationCodePreview) => string;
  /** Llamadas HTTP (inyectables en pruebas). */
  api?: CodeApi;
  /** Mostrar dentro de una ventana (Fincas), igual que Nueva finca. */
  inWindow?: boolean;
};

/**
 * Controla el formulario: escribir → comprobar → confirmar → unirse.
 * @param props - Textos, salida tras aceptar y cancelación.
 */
export function InvitationCodeForm({
  onAccepted,
  onCancel,
  joinedMessage,
  api,
  inWindow = false,
  ...texts
}: Readonly<Props>) {
  const runner = useRef<CodeRunner | null>(null);
  if (runner.current === null) runner.current = createCodeRunner(api ?? DEFAULT_API);
  const mounted = useRef(true);
  const accepted = useRef(false);
  const [step, setStep] = useState<CodeStep>("enter");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitationCodePreview | null>(null);
  const [error, setError] = useState<CodeError | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => {
      // Al cambiar de pantalla se descartan las respuestas pendientes.
      mounted.current = false;
    };
  }, []);

  const requestPreview = async () => {
    if (step !== "enter" || !runner.current) return;
    setError(null);
    setStep("checking");
    const outcome = await runner.current.preview(code);
    if (!mounted.current) return;
    if (outcome.ok) {
      setPreview(outcome.value);
      setStep("confirm");
      return;
    }
    setError(outcome.error);
    setStep("enter");
  };

  const confirm = async () => {
    if (step !== "confirm" || !preview || !runner.current) return;
    setError(null);
    setStep("accepting");
    const outcome = await runner.current.accept(code);
    if (!mounted.current) return;
    if (outcome.ok) {
      setStep("joined");
      setMessage(joinedMessage ? joinedMessage(outcome.value, preview) : "");
      setCode("");
      if (!accepted.current) {
        accepted.current = true;
        onAccepted(outcome.value, preview);
      }
      return;
    }
    setError(outcome.error);
    // Un 409 o un error temporal permiten reintentar o cambiar el código.
    setStep(outcome.error.kind === "not_found" ? "enter" : "confirm");
    if (outcome.error.kind === "not_found") setPreview(null);
  };

  const view = (
    <InvitationCodeView
      {...texts}
      hideTitle={inWindow}
      step={step}
      code={code}
      preview={preview}
      error={error}
      joinedMessage={message}
      onCodeChange={(value) => {
        setCode(value);
        setError(null);
      }}
      onPreview={() => void requestPreview()}
      onConfirm={() => void confirm()}
      onBack={() => {
        setPreview(null);
        setError(null);
        setStep("enter");
      }}
      onCancel={onCancel}
    />
  );

  return inWindow ? (
    <FormWindow title={texts.title} onClose={onCancel ?? (() => undefined)}>
      {view}
    </FormWindow>
  ) : (
    view
  );
}

/**
 * Pantalla de aceptación de una invitación a finca.
 *
 * Propósito: mostrar la cuenta activa, pedir la confirmación y presentar el
 * resultado real del backend.
 * Contexto: se muestra después del login cuando hay un token pendiente. La
 * aceptación nunca es automática: la persona confirma con la cuenta visible.
 * El backend valida que la cuenta corresponda al correo invitado y que esté
 * verificado; esta pantalla no lo replica.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import "../../../styles/invitation-accept.css";
import { FieldIcon } from "../../../components/ui/FieldIcon.tsx";
import type { Account } from "../../auth/types/index.ts";
import { acceptInvitation } from "../services/acceptApi.ts";
import { createAcceptRunner, type AcceptRunner } from "../services/acceptFlow.ts";
import type { AcceptState } from "../types/index.ts";

/** Espera antes de abrir la finca tras aceptar, para leer el mensaje. */
export const REDIRECT_DELAY_MS = 1500;

type Actions = {
  onAccept: () => void;
  onGoToFarm: (farmId: number) => void;
  onGoToFarms: () => void;
  onSwitchAccount: () => void;
  onDiscard: () => void;
};

type ViewProps = Actions & {
  account: Account;
  state: AcceptState;
};

function fullName(account: Account): string {
  return `${account.first_name} ${account.last_name}`.trim() || account.identification;
}

function renderActions(state: AcceptState, actions: Actions) {
  const busy = state.kind === "accepting";
  if (state.kind === "ready" || busy) {
    return (
      <>
        <button type="button" className="solid" disabled={busy} onClick={actions.onAccept}>
          {busy ? "Aceptando..." : "Aceptar invitación"}
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={actions.onSwitchAccount}>
          Ingresar con otra cuenta
        </button>
        <button type="button" className="text-link" disabled={busy} onClick={actions.onDiscard}>
          Ahora no
        </button>
      </>
    );
  }
  if (state.kind === "accepted" && state.farmId !== undefined) {
    const farmId = state.farmId;
    return (
      <>
        <button type="button" className="solid" onClick={() => actions.onGoToFarm(farmId)}>
          Ir a la finca
        </button>
        <button type="button" className="ghost" onClick={actions.onGoToFarms}>
          Ir a Fincas
        </button>
      </>
    );
  }
  if (state.kind === "already_member") {
    return (
      <button type="button" className="solid" onClick={actions.onGoToFarms}>
        Ir a Fincas
      </button>
    );
  }
  if (state.kind === "session_expired") {
    return (
      <button type="button" className="solid" onClick={actions.onSwitchAccount}>
        Iniciar sesión de nuevo
      </button>
    );
  }
  if (state.kind === "invalid") {
    return (
      <>
        <button type="button" className="solid" onClick={actions.onSwitchAccount}>
          Ingresar con otra cuenta
        </button>
        <button type="button" className="ghost" onClick={actions.onDiscard}>
          Ir al inicio
        </button>
      </>
    );
  }
  return (
    <>
      <button type="button" className="solid" onClick={actions.onAccept}>
        Reintentar
      </button>
      <button type="button" className="text-link" onClick={actions.onDiscard}>
        Ahora no
      </button>
    </>
  );
}

/**
 * Vista sin efectos de la aceptación (útil para pruebas estáticas).
 * @param props - Cuenta, estado actual y acciones.
 * @returns Tarjeta de aceptación.
 */
export function InvitationAcceptView({ account, state, ...actions }: Readonly<ViewProps>) {
  const tone = state.kind === "accepted" ? "is-ok" : "is-warn";
  const showMessage = state.kind !== "ready" && state.kind !== "accepting";
  return (
    <main className="shell invite-shell">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <section
        className="form invite-card"
        aria-labelledby="invite-title"
        aria-busy={state.kind === "accepting"}
        data-state={state.kind}
      >
        <div className="form-mark" aria-hidden="true">
          <FieldIcon name="mail" />
        </div>
        <header className="form-intro">
          <p className="brand">AGROTECH-T</p>
          <h2 id="invite-title">Invitación a una finca</h2>
          <p>Te invitaron a formar parte de una finca.</p>
        </header>
        <dl className="invite-account">
          <div>
            <dt>Cuenta activa</dt>
            <dd>{fullName(account)}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{account.correo}</dd>
          </div>
        </dl>
        {state.kind === "ready" || state.kind === "accepting" ? (
          <p className="hint">
            Debes usar la cuenta del correo al que llegó la invitación y tener ese correo
            verificado.
          </p>
        ) : null}
        {state.kind === "accepting" ? (
          <p className="invite-message is-busy" role="status">
            Aceptando la invitación...
          </p>
        ) : null}
        {showMessage ? (
          <p className={`invite-message ${tone}`} role={tone === "is-ok" ? "status" : "alert"}>
            {state.message}
          </p>
        ) : null}
        <div className="invite-actions">{renderActions(state, actions)}</div>
      </section>
    </main>
  );
}

type Props = {
  account: Account;
  token: string;
  /** Ejecutor de aceptación (inyectable en pruebas). */
  runner?: AcceptRunner;
  onAccepted: (farmId: number) => void;
  onGoToFarms: () => void;
  onSwitchAccount: () => void;
  onDiscard: () => void;
};

/**
 * Controla la aceptación: un solo vuelo, estados y redirección.
 * @param props - Cuenta, token pendiente y salidas.
 * @returns Pantalla de aceptación.
 */
export function InvitationAcceptScreen({
  account,
  token,
  runner,
  onAccepted,
  onGoToFarms,
  onSwitchAccount,
  onDiscard,
}: Readonly<Props>) {
  const run = useRef<AcceptRunner>(runner ?? createAcceptRunner(acceptInvitation));
  const [state, setState] = useState<AcceptState>({ kind: "ready", message: "" });

  const accept = () => {
    setState({ kind: "accepting", message: "" });
    void run.current(token).then((outcome) => setState(outcome));
  };

  useEffect(() => {
    if (state.kind !== "accepted" || state.farmId === undefined) return;
    const farmId = state.farmId;
    const timer = setTimeout(() => onAccepted(farmId), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, onAccepted]);

  return (
    <InvitationAcceptView
      account={account}
      state={state}
      onAccept={accept}
      onGoToFarm={onAccepted}
      onGoToFarms={onGoToFarms}
      onSwitchAccount={onSwitchAccount}
      onDiscard={onDiscard}
    />
  );
}

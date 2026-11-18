/**
 * Tarjeta de espera o error del acceso.
 *
 * Propósito: ocupar la pantalla mientras se comprueba la sesión o el acceso a
 * fincas, para no mostrar un login ni un panel incorrectos durante la carga.
 * Contexto: misma estética que la aceptación de invitaciones.
 * @author Cristian Deysdayr Jimenez
 */

import inicioIcon from "../../../assets/icons/inicio.png";
import "../../../styles/invitation-accept.css";

export type StatusAction = {
  label: string;
  onClick: () => void;
  variant?: "solid" | "ghost" | "text-link";
  /** Icono opcional del botón. */
  icon?: "reload" | "home";
};

type Props = {
  title: string;
  message: string;
  /** busy: comprobando; warn: falló. */
  tone: "busy" | "warn";
  actions?: readonly StatusAction[];
};

/**
 * @param props - Título, mensaje, tono y acciones.
 * @returns Tarjeta centrada.
 */
export function SessionStatusView({ title, message, tone, actions = [] }: Readonly<Props>) {
  return (
    <main className="shell invite-shell">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <section
        className="form invite-card"
        aria-labelledby="session-status-title"
        aria-busy={tone === "busy"}
        data-tone={tone}
      >
        <header className="form-intro">
          <span className={`invite-mark invite-mark--${tone}`} aria-hidden="true">
            {tone === "busy" ? <BusyMark /> : <WarnMark />}
          </span>
          <p className="brand">AGROTECH-T</p>
          <h2 id="session-status-title">{title}</h2>
        </header>
        <p
          className={`invite-message ${tone === "busy" ? "is-busy" : "is-warn"}`}
          role={tone === "busy" ? "status" : "alert"}
        >
          {message}
        </p>
        {actions.length > 0 ? (
          <div className="invite-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`${action.variant ?? "solid"} invite-action`}
                onClick={action.onClick}
              >
                {action.icon ? <ActionIcon kind={action.icon} /> : null}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

/**
 * Icono del botón según la acción.
 * @param props - Tipo de icono.
 * @returns Marca visual.
 */
function ActionIcon({ kind }: Readonly<{ kind: "reload" | "home" }>) {
  if (kind === "home") {
    return <img className="invite-action__icon" src={inicioIcon} alt="" />;
  }
  return (
    <svg className="invite-action__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12a8 8 0 1 1-2.2-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BusyMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.28" />
      <path
        d="M40 24a16 16 0 0 0-16-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WarnMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="currentColor" opacity="0.14" />
      <path
        d="M24 14v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="33" r="2.2" fill="currentColor" />
    </svg>
  );
}

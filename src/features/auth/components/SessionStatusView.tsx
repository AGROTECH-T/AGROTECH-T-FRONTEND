/**
 * Tarjeta de espera o error del acceso.
 *
 * Propósito: ocupar la pantalla mientras se comprueba la sesión o el acceso a
 * fincas, para no mostrar un login ni un panel incorrectos durante la carga.
 * Contexto: misma estética que la aceptación de invitaciones.
 * @author Cristian Deysdayr Jimenez
 */

import "../../../styles/invitation-accept.css";

export type StatusAction = {
  label: string;
  onClick: () => void;
  variant?: "solid" | "ghost" | "text-link";
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
                className={action.variant ?? "solid"}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

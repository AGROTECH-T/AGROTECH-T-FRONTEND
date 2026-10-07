/**
 * Panel de bienvenida con la fotografía del cultivo.
 *
 * Propósito: invitar a cambiar entre ingresar y crear cuenta.
 * Contexto: lado opuesto al formulario, en la misma tonalidad.
 * @author Cristian Deysdayr Jimenez
 */

import campo from "../../../assets/campo.jpg";
import type { Mode } from "../types/index.ts";

type Props = {
  mode: Mode;
  onSwitch: () => void;
};

/**
 * Muestra el mensaje y el botón que cambia de panel.
 * @param props - Modo visible y acción de cambio.
 * @returns Sección de bienvenida.
 */
export function WelcomeSide({ mode, onSwitch }: Readonly<Props>) {
  const signingIn = mode === "signin";
  const title = signingIn ? "Hola" : "Bienvenido";
  const copy = signingIn
    ? "Registra tu cuenta y empieza a cuidar la producción desde un solo lugar."
    : "Ingresa para seguir el trabajo de tu finca con la misma calma."
  const action = signingIn ? "Crear cuenta" : "Ingresar";

  return (
    <section className="panel welcome" aria-labelledby="welcome-title">
      <img src={campo} alt="Plántula verde en un cultivo al amanecer" />
      <div className="welcome-copy">
        <p className="brand">AGROTECH-T</p>
        <h1 id="welcome-title">{title}</h1>
        <p>{copy}</p>
        <button type="button" className="ghost" onClick={onSwitch}>
          {action}
        </button>
      </div>
    </section>
  );
}

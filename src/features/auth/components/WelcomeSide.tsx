/**
 * Panel de bienvenida con la fotografía del cultivo.
 *
 * Propósito: acompañar el formulario con el mensaje de la finca.
 * Contexto: lado opuesto al formulario, en la misma tonalidad.
 * @author Cristian Deysdayr Jimenez
 */

import campo from "../../../assets/campo.jpg";
import type { Mode } from "../types/index.ts";

type Props = {
  mode: Mode;
};

/**
 * Muestra el mensaje según el formulario visible.
 * @param props - Modo visible de la pantalla.
 * @returns Sección de bienvenida.
 */
export function WelcomeSide({ mode }: Readonly<Props>) {
  const signingIn = mode === "signin";
  const title = signingIn ? "Tu finca, en un solo lugar" : "Empieza con orden";
  const copy = signingIn
    ? "AGROTECH-T resuelve el desorden de la finca: inventario, galpones y bitácora juntos, con datos al día para no perder stock, aves ni registros."
    : "Crea tu cuenta y resuelve desde hoy el control de inventario, galpones y bitácora, sin planillas dispersas.";

  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <img src={campo} alt="Plántula verde en un cultivo al amanecer" />
      <div className="welcome-copy">
        <p className="brand">AGROTECH-T</p>
        <h1 id="welcome-title">{title}</h1>
        <p>{copy}</p>
      </div>
    </section>
  );
}

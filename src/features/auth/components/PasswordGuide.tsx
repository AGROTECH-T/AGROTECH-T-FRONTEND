/**
 * Guía visible de una contraseña segura.
 *
 * Propósito: marcar cada requisito y llenar la barra al cumplirlo.
 * Contexto: alta de cuenta y contraseña nueva.
 * @author Cristian Deysdayr Jimenez
 */

import { passwordRules } from "../services/passwordRules.ts";

type Props = {
  value: string;
};

/**
 * Muestra los chulos y el avance de la clave.
 * @param props - Texto que la persona está escribiendo.
 * @returns Lista de reglas y barra de avance.
 */
export function PasswordGuide({ value }: Readonly<Props>) {
  const rules = passwordRules(value);
  const done = rules.filter((rule) => rule.met).length;
  const full = done === rules.length;

  return (
    <div className="guide">
      <meter
        className={full ? "guide-bar full" : "guide-bar"}
        min={0}
        max={rules.length}
        value={done}
        aria-label="Seguridad de la contraseña"
      />
      <ul>
        {rules.map((rule) => (
          <li key={rule.id} className={rule.met ? "met" : undefined}>
            <span className="tick" aria-hidden="true">{rule.met ? "✓" : ""}</span>
            {" "}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

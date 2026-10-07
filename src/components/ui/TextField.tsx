/**
 * Campo neomórfico con etiqueta visible.
 *
 * Propósito: un input accesible, hundido en la misma superficie.
 * Contexto: formularios de acceso de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import type { ChangeEvent } from "react";
import { FieldIcon } from "./FieldIcon.tsx";

type IconName = "user" | "mail" | "phone" | "lock";

type Props = {
  id: string;
  label: string;
  type?: string;
  value: string;
  autoComplete: string;
  icon?: IconName;
  onChange: (value: string) => void;
};

/**
 * Renderiza etiqueta e input asociados.
 * @param props - Identificador, texto visible y valor controlado.
 * @returns Campo de formulario.
 */
export function TextField({
  id,
  label,
  type = "text",
  value,
  autoComplete,
  icon,
  onChange,
}: Readonly<Props>) {
  const update = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="field-box">
        {icon ? <FieldIcon name={icon} /> : null}
        <input
          id={id}
          className={icon ? "with-icon" : undefined}
          type={type}
          value={value}
          autoComplete={autoComplete}
          onChange={update}
        />
      </span>
    </label>
  );
}

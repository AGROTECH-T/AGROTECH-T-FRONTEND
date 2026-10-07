/**
 * Campo neomórfico con etiqueta visible.
 *
 * Propósito: un input accesible, hundido en la misma superficie.
 * Contexto: formularios de acceso de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type ChangeEvent } from "react";
import { FieldIcon } from "./FieldIcon.tsx";

type IconName = "user" | "mail" | "phone" | "lock";

type Props = {
  id: string;
  label: string;
  type?: string;
  value: string;
  autoComplete: string;
  icon?: IconName;
  placeholder?: string;
  message?: string;
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
  placeholder,
  message = "",
  onChange,
}: Readonly<Props>) {
  const [visible, setVisible] = useState(false);
  const secret = type === "password";
  const shown = secret && visible ? "text" : type;
  const update = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  const classes = [icon ? "with-icon" : "", secret ? "with-reveal" : ""].filter(Boolean).join(" ");

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="field-box">
        {icon ? <FieldIcon name={icon} /> : null}
        <input
          id={id}
          className={classes || undefined}
          type={shown}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={update}
        />
        {secret ? (
          <button
            type="button"
            className="reveal"
            aria-pressed={visible}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setVisible((current) => !current)}
          >
            <FieldIcon name={visible ? "eye-off" : "eye"} />
          </button>
        ) : null}
      </span>
      {message ? <p className="field-error" id={`${id}-error`}>{message}</p> : null}
    </div>
  );
}

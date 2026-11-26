/**
 * Campo neomórfico con etiqueta visible.
 *
 * Propósito: un input accesible, hundido en la misma superficie.
 * Contexto: formularios de acceso de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type ChangeEvent } from "react";
import { CharLeft, clip } from "./CharLeft.tsx";
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
  /** Tope real del dato. Corta al escribir y muestra cuántos faltan. */
  max?: number;
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
  max,
  onChange,
}: Readonly<Props>) {
  const [visible, setVisible] = useState(false);
  const secret = type === "password";
  const shown = secret && visible ? "text" : type;
  const text = max === undefined ? value : clip(value, max);
  const described = [message ? `${id}-error` : "", max !== undefined ? `${id}-left` : ""]
    .filter(Boolean)
    .join(" ");
  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    onChange(max === undefined ? next : clip(next, max));
  };
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
          value={text}
          maxLength={max}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={message ? true : undefined}
          aria-describedby={described || undefined}
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
      {max !== undefined ? <CharLeft id={`${id}-left`} value={text} max={max} /> : null}
      {message ? <p className="field-error" id={`${id}-error`}>{message}</p> : null}
    </div>
  );
}

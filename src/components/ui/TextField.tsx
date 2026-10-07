/**
 * Campo neomórfico con etiqueta visible.
 *
 * Propósito: un input accesible, hundido en la misma superficie.
 * Contexto: formularios de acceso de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import type { ChangeEvent } from "react";

type Props = {
  id: string;
  label: string;
  type?: string;
  value: string;
  autoComplete: string;
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
  onChange,
}: Readonly<Props>) {
  const update = (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value);
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type={type} value={value} autoComplete={autoComplete} onChange={update} />
    </label>
  );
}

/**
 * Fila de dato del perfil.
 *
 * Propósito: mostrar un dato con su icono y su etiqueta.
 * Contexto: tarjeta de contacto de "Mi perfil".
 * @author Cristian Deysdayr Jimenez
 */

import { FieldIcon } from "../../../components/ui/FieldIcon.tsx";

type IconName = "id" | "mail" | "phone";

type Props = {
  icon: IconName;
  label: string;
  value: string;
};

/**
 * Dato del perfil con icono y etiqueta.
 * @param props - Icono, etiqueta y valor del campo.
 * @returns Fila de la tarjeta de contacto.
 */
export function ProfileField({ icon, label, value }: Readonly<Props>) {
  return (
    <li className="profile-field">
      <span className="profile-field__icon" aria-hidden="true">
        <FieldIcon name={icon} />
      </span>
      <span className="profile-field__text">
        <span className="profile-field__label">{label}</span>
        <span className="profile-field__value">{value || "Sin registrar"}</span>
      </span>
    </li>
  );
}

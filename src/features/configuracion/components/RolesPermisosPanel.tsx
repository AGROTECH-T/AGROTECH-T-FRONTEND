/**
 * Submódulo Roles y permisos.
 *
 * Propósito: asignar el rol de cada persona en sus fincas.
 * Contexto: contenido de Configuración.
 * @author Cristian Deysdayr Jimenez
 */

import { AsignacionRoles } from "./AsignacionRoles.tsx";

type Props = {
  tick?: number;
};

/**
 * Contenido de Roles y permisos.
 * @param props - Pulso de navegación del menú.
 * @returns Asignación de roles.
 */
export function RolesPermisosPanel({ tick = 0 }: Readonly<Props>) {
  return <AsignacionRoles tick={tick} />;
}

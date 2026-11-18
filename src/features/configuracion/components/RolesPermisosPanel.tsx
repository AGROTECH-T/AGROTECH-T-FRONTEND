/**
 * Submódulo Roles y permisos.
 *
 * Propósito: asignar el rol de cada persona en sus fincas.
 * Contexto: contenido de Configuración.
 * @author Cristian Deysdayr Jimenez
 */

import { AsignacionRoles } from "./AsignacionRoles.tsx";

/**
 * Contenido de Roles y permisos.
 * @returns Asignación de roles.
 */
export function RolesPermisosPanel() {
  return <AsignacionRoles />;
}

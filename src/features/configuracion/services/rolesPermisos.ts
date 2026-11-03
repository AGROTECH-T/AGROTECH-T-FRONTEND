/**
 * Servicio del submódulo Roles y permisos.
 *
 * Propósito: consultar el catálogo funcional de la API.
 * Contexto: requiere la sesión vigente del usuario autenticado.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken } from "../../auth/services/session.ts";
import { getJson } from "../../../services/api/client.ts";
import type { CatalogoRoles } from "../types/index.ts";

const ROLES_PERMISOS_PATH = "/api/v1/configuracion/roles-permisos/";

/**
 * Obtiene los roles, actores, matriz y reglas de autorización.
 * @returns Catálogo completo listo para la pantalla.
 */
export function fetchRolesPermisos(): Promise<CatalogoRoles> {
  return getJson<CatalogoRoles>(ROLES_PERMISOS_PATH, readToken());
}

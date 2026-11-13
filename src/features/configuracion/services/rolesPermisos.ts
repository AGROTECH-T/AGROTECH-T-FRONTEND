/**
 * Servicio del submódulo Roles y permisos.
 *
 * Propósito: consultar el catálogo, las personas y cambiar roles, permisos y estado.
 * Contexto: requiere la sesión vigente de un administrador de finca.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken } from "../../auth/services/session.ts";
import { deleteJson, getJson, postJson, putJson } from "../../../services/api/client.ts";
import type {
  AsignacionRoles,
  CatalogoRoles,
  NuevoUsuario,
  RolId,
  UsuarioAsignado,
} from "../types/index.ts";

const BASE = "/api/v1/configuracion";

/**
 * Obtiene los roles, la matriz y los permisos que se pueden asignar.
 * @returns Catálogo completo listo para la pantalla.
 */
export function fetchRolesPermisos(): Promise<CatalogoRoles> {
  return getJson<CatalogoRoles>(`${BASE}/roles-permisos/`, readToken());
}

/**
 * Lista las personas de las fincas que administra la sesión.
 * @param search - Texto libre por nombre, documento o correo.
 * @returns Si puede asignar y las fichas con su rol por finca.
 */
export function fetchAsignacion(search = ""): Promise<AsignacionRoles> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return getJson<AsignacionRoles>(`${BASE}/usuarios/${query}`, readToken());
}

/**
 * Trae la ficha con permisos del rol y permisos directos.
 * @param userId - Cuenta destino.
 * @returns Ficha completa.
 */
export function fetchPersona(userId: number): Promise<UsuarioAsignado> {
  return getJson<UsuarioAsignado>(`${BASE}/usuarios/${userId}/`, readToken());
}

/**
 * Crea una cuenta con su rol y sus permisos adicionales.
 * @param datos - Datos básicos, finca, rol y permisos.
 * @returns Ficha creada.
 */
export function crearUsuario(datos: NuevoUsuario): Promise<UsuarioAsignado> {
  return postJson<UsuarioAsignado>(`${BASE}/usuarios/`, datos, readToken());
}

/**
 * Reemplaza el rol de una persona en una finca.
 * @param userId - Cuenta destino.
 * @param farmId - Finca de la membresía.
 * @param role - Rol nuevo.
 * @returns Ficha actualizada.
 */
export function cambiarRol(userId: number, farmId: number, role: RolId): Promise<UsuarioAsignado> {
  return putJson<UsuarioAsignado>(
    `${BASE}/usuarios/${userId}/rol/`,
    { farm_id: farmId, role },
    readToken(),
  );
}

/**
 * Suma un permiso directo a una membresía.
 * @param userId - Cuenta destino.
 * @param farmId - Finca de la membresía.
 * @param permission - Código del permiso.
 * @returns Ficha actualizada.
 */
export function agregarPermiso(
  userId: number,
  farmId: number,
  permission: string,
): Promise<UsuarioAsignado> {
  return postJson<UsuarioAsignado>(
    `${BASE}/usuarios/${userId}/permisos/`,
    { farm_id: farmId, permission },
    readToken(),
  );
}

/**
 * Retira un permiso directo de una membresía.
 * @param userId - Cuenta destino.
 * @param farmId - Finca de la membresía.
 * @param permission - Código del permiso.
 * @returns Ficha actualizada.
 */
export function quitarPermiso(
  userId: number,
  farmId: number,
  permission: string,
): Promise<UsuarioAsignado> {
  const query = `?farm_id=${farmId}&permission=${encodeURIComponent(permission)}`;
  return deleteJson(`${BASE}/usuarios/${userId}/permisos/${query}`, readToken()).then(() =>
    fetchPersona(userId),
  );
}

/**
 * Activa o inactiva la cuenta de una persona.
 * @param userId - Cuenta destino.
 * @param activo - Estado nuevo.
 * @returns Ficha actualizada.
 */
export function cambiarEstado(userId: number, activo: boolean): Promise<UsuarioAsignado> {
  return putJson<UsuarioAsignado>(
    `${BASE}/usuarios/${userId}/estado/`,
    { activo },
    readToken(),
  );
}

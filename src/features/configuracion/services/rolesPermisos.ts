/**
 * Servicio del submódulo Roles y permisos.
 *
 * Propósito: consultar el catálogo, las personas y cambiar roles, permisos y estado.
 * Contexto: requiere la sesión vigente de un administrador de finca.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken } from "../../auth/services/session.ts";
import { deleteJson, getJson, postJson, putJson } from "../../../services/api/client.ts";
import { onSessionEnd } from "../../../services/sessionMemory.ts";
import type {
  AsignacionRoles,
  CatalogoRoles,
  NuevoUsuario,
  RolId,
  UsuarioAsignado,
} from "../types/index.ts";

const BASE = "/api/v1/configuracion";
const FRESH_MS = 20_000;

let rolesEntry: { promise: Promise<CatalogoRoles>; snap?: CatalogoRoles } | null = null;
let peopleEntry: { at: number; promise: Promise<AsignacionRoles>; snap?: AsignacionRoles } | null = null;

/** Personas ya cargadas para Configuración. */
export function asignacionNow(): AsignacionRoles | null {
  return peopleEntry?.snap ?? null;
}

/** Catálogo de roles ya cargado. */
export function rolesNow(): CatalogoRoles | null {
  return rolesEntry?.snap ?? null;
}

/** Obliga a volver a pedir personas y roles. */
export function forgetAsignacion(): void {
  peopleEntry = null;
  rolesEntry = null;
}

/** Pide personas y roles antes de abrir Configuración. */
export function preloadConfig(): void {
  void fetchAsignacion();
  void fetchRolesPermisos();
}

onSessionEnd(forgetAsignacion);

function savedPeople<T>(work: Promise<T>): Promise<T> {
  return work.then((value) => {
    peopleEntry = null;
    return value;
  });
}

/**
 * Obtiene los roles, la matriz y los permisos que se pueden asignar.
 * @returns Catálogo completo listo para la pantalla.
 */
export function fetchRolesPermisos(): Promise<CatalogoRoles> {
  if (rolesEntry) return rolesEntry.promise;
  const promise = getJson<CatalogoRoles>(`${BASE}/roles-permisos/`, readToken())
    .then((data) => {
      if (rolesEntry?.promise === promise) rolesEntry.snap = data;
      return data;
    })
    .catch((error: unknown) => {
      if (rolesEntry?.promise === promise) rolesEntry = null;
      throw error;
    });
  rolesEntry = { promise };
  return promise;
}

/**
 * Lista las personas de las fincas que administra la sesión.
 * @param search - Texto libre por nombre, documento o correo.
 * @returns Si puede asignar y las fichas con su rol por finca.
 */
export function fetchAsignacion(search = ""): Promise<AsignacionRoles> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  if (search) return getJson<AsignacionRoles>(`${BASE}/usuarios/${query}`, readToken());
  if (peopleEntry && Date.now() - peopleEntry.at < FRESH_MS) return peopleEntry.promise;
  const at = Date.now();
  const promise = getJson<AsignacionRoles>(`${BASE}/usuarios/`, readToken())
    .then((data) => {
      if (peopleEntry?.promise === promise) peopleEntry.snap = data;
      return data;
    })
    .catch((error: unknown) => {
      if (peopleEntry?.promise === promise) peopleEntry = null;
      throw error;
    });
  peopleEntry = { at, promise };
  return promise;
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
  return savedPeople(postJson<UsuarioAsignado>(`${BASE}/usuarios/`, datos, readToken()));
}

/**
 * Reemplaza el rol de una persona en una finca.
 * @param userId - Cuenta destino.
 * @param farmId - Finca de la membresía.
 * @param role - Rol nuevo.
 * @returns Ficha actualizada.
 */
export function cambiarRol(userId: number, farmId: number, role: RolId): Promise<UsuarioAsignado> {
  return savedPeople(
    putJson<UsuarioAsignado>(
      `${BASE}/usuarios/${userId}/rol/`,
      { farm_id: farmId, role },
      readToken(),
    ),
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
  return savedPeople(
    postJson<UsuarioAsignado>(
      `${BASE}/usuarios/${userId}/permisos/`,
      { farm_id: farmId, permission },
      readToken(),
    ),
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
  return savedPeople(
    deleteJson(`${BASE}/usuarios/${userId}/permisos/${query}`, readToken()).then(() =>
      fetchPersona(userId),
    ),
  );
}

/**
 * Activa o inactiva la cuenta de una persona.
 * @param userId - Cuenta destino.
 * @param activo - Estado nuevo.
 * @returns Ficha actualizada.
 */
export function cambiarEstado(userId: number, activo: boolean): Promise<UsuarioAsignado> {
  return savedPeople(
    putJson<UsuarioAsignado>(
      `${BASE}/usuarios/${userId}/estado/`,
      { activo },
      readToken(),
    ),
  );
}

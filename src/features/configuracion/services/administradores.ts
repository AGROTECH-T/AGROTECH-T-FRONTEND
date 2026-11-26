/**
 * Servicio del superadmin para nombrar administradores.
 *
 * Propósito: listar cuentas en espera, crear, promover y quitar.
 * Contexto: sin este nombramiento la cuenta solo ve Inicio.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken } from "../../auth/services/session.ts";
import { getJson, postJson } from "../../../services/api/client.ts";
import { onSessionEnd } from "../../../services/sessionMemory.ts";

export type CuentaPlataforma = {
  id: number;
  nombre: string;
  identification: string;
  correo: string;
  activo: boolean;
  is_administrador: boolean;
};

export type ListaAdministradores = {
  pendientes: CuentaPlataforma[];
  administradores: CuentaPlataforma[];
};

export type NuevoAdministrador = {
  first_name: string;
  last_name: string;
  identification: string;
  correo: string;
  phone: string;
  password: string;
};

const BASE = "/api/v1/configuracion/administradores/";

let adminsEntry: { promise: Promise<ListaAdministradores>; snap?: ListaAdministradores } | null = null;

/** Listas ya traídas del nombramiento. */
export function administradoresNow(): ListaAdministradores | null {
  return adminsEntry?.snap ?? null;
}

function forgetAdministradores(): void {
  adminsEntry = null;
}

function savedAdmins<T>(work: Promise<T>): Promise<T> {
  return work.then((value) => {
    forgetAdministradores();
    return value;
  });
}

onSessionEnd(forgetAdministradores);

/** Filas por página en pendientes y administradores. */
export const ADMIN_PAGE_SIZE = 5;

/**
 * Trae pendientes y administradores ya nombrados.
 * @returns Listas separadas.
 */
export function fetchAdministradores(): Promise<ListaAdministradores> {
  if (adminsEntry) return adminsEntry.promise;
  const promise = getJson<ListaAdministradores>(BASE, readToken())
    .then((data) => {
      if (adminsEntry?.promise === promise) adminsEntry.snap = data;
      return data;
    })
    .catch((error: unknown) => {
      if (adminsEntry?.promise === promise) adminsEntry = null;
      throw error;
    });
  adminsEntry = { promise };
  return promise;
}

/**
 * Crea una cuenta nueva con todos los permisos de administrador.
 * @param datos - Datos de la persona.
 * @returns Ficha del administrador creado.
 */
export function crearAdministrador(datos: NuevoAdministrador): Promise<CuentaPlataforma> {
  return savedAdmins(postJson<CuentaPlataforma>(BASE, datos, readToken()));
}

/**
 * Nombra administradora a una cuenta que ya se había registrado.
 * @param userId - Identificador de la cuenta.
 * @returns Ficha actualizada.
 */
export function promoverAdministrador(userId: number): Promise<CuentaPlataforma> {
  return savedAdmins(postJson<CuentaPlataforma>(`${BASE}${userId}/promover/`, {}, readToken()));
}

/**
 * Retira el permiso de administrador de plataforma.
 * @param userId - Identificador de la cuenta.
 * @returns Ficha actualizada.
 */
export function quitarAdministrador(userId: number): Promise<CuentaPlataforma> {
  return savedAdmins(postJson<CuentaPlataforma>(`${BASE}${userId}/quitar/`, {}, readToken()));
}

/**
 * Filtra por nombre o documento.
 * @param filas - Cuentas visibles.
 * @param query - Texto de búsqueda.
 * @returns Coincidencias.
 */
export function filtrarCuentas(filas: CuentaPlataforma[], query: string): CuentaPlataforma[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return filas;
  return filas.filter((item) =>
    `${item.nombre} ${item.identification}`.toLowerCase().includes(needle),
  );
}

/**
 * Recorta una página de la lista.
 * @param filas - Lista filtrada.
 * @param page - Página 1-indexada.
 * @param size - Tamaño de página.
 * @returns Slice de la página.
 */
export function paginaCuentas(
  filas: CuentaPlataforma[],
  page: number,
  size = ADMIN_PAGE_SIZE,
): CuentaPlataforma[] {
  const start = Math.max(0, (page - 1) * size);
  return filas.slice(start, start + size);
}

/**
 * Servicio del superadmin para nombrar administradores.
 *
 * Propósito: listar cuentas en espera, crear administradores y promover.
 * Contexto: sin este nombramiento la cuenta solo ve Inicio.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken } from "../../auth/services/session.ts";
import { getJson, postJson } from "../../../services/api/client.ts";

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

/**
 * Trae pendientes y administradores ya nombrados.
 * @returns Listas separadas.
 */
export function fetchAdministradores(): Promise<ListaAdministradores> {
  return getJson<ListaAdministradores>(BASE, readToken());
}

/**
 * Crea una cuenta nueva con todos los permisos de administrador.
 * @param datos - Datos de la persona.
 * @returns Ficha del administrador creado.
 */
export function crearAdministrador(datos: NuevoAdministrador): Promise<CuentaPlataforma> {
  return postJson<CuentaPlataforma>(BASE, datos, readToken());
}

/**
 * Nombra administradora a una cuenta que ya se había registrado.
 * @param userId - Identificador de la cuenta.
 * @returns Ficha actualizada.
 */
export function promoverAdministrador(userId: number): Promise<CuentaPlataforma> {
  return postJson<CuentaPlataforma>(`${BASE}${userId}/promover/`, {}, readToken());
}

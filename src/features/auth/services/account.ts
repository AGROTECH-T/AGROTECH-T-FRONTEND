/**
 * Operaciones de cuentas.
 *
 * Propósito: login, consulta y cierre de sesión.
 * Contexto: usa el cliente HTTP compartido.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson, postJson } from "../../../services/api/client.ts";
import type { Account, LoginResult, OkResult } from "../types/index.ts";

/**
 * Consulta la cuenta autenticada.
 * @param token - JWT cifrado vigente.
 * @returns Datos visibles de la cuenta.
 */
export function fetchAccount(token: string): Promise<Account> {
  return getJson<Account>("/api/v1/auth/me/", token);
}

/**
 * Cierra la sesión en el servidor.
 * @param token - JWT que se va a revocar.
 */
export function logout(token: string): Promise<OkResult> {
  return postJson<OkResult>("/api/v1/auth/logout/", {}, token);
}

/**
 * Abre una sesión.
 * @param identification - Documento de la cuenta.
 * @param password - Contraseña en claro, solo en tránsito.
 * @returns Token cifrado.
 */
export function login(identification: string, password: string): Promise<LoginResult> {
  return postJson<LoginResult>("/api/v1/auth/login/", { identification, password });
}

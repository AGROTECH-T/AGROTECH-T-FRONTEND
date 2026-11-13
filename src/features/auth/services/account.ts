/**
 * Operaciones de cuentas.
 *
 * Propósito: login, consulta y cierre de sesión.
 * Contexto: usa el cliente HTTP compartido.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson, patchJson, postJson } from "../../../services/api/client.ts";
import type {
  Account,
  LoginResult,
  OkResult,
  ProfileUpdate,
  VerificationRequestResult,
} from "../types/index.ts";

/**
 * Consulta la cuenta autenticada.
 * @param token - JWT cifrado vigente.
 * @returns Datos visibles de la cuenta.
 */
export function fetchAccount(token: string): Promise<Account> {
  return getJson<Account>("/api/v1/auth/me/", token);
}

/**
 * Guarda los datos editables del perfil.
 * @param token - JWT cifrado vigente.
 * @param changes - Nombre, apellidos, correo y celular.
 * @returns La cuenta ya actualizada.
 */
export function updateAccount(token: string, changes: ProfileUpdate): Promise<Account> {
  return patchJson<Account>("/api/v1/auth/me/", changes, token);
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

/**
 * Renueva la sesión: invalida el token vigente y devuelve uno nuevo.
 * Solo funciona antes de que el token venza (POST /api/v1/auth/session/renew/).
 * @param token - JWT cifrado vigente.
 * @returns Token nuevo.
 */
export function renewSession(token: string): Promise<LoginResult> {
  // La renovación nunca se reintenta con otro token: rotaría una sesión ajena al intento.
  return postJson<LoginResult>("/api/v1/auth/session/renew/", {}, token, {
    retryOnRotation: false,
  });
}

/**
 * Pide al backend que envíe un código de verificación al correo de la cuenta.
 * @param token - JWT cifrado vigente.
 * @returns ok y la vigencia del código en segundos.
 */
export function requestEmailVerification(token: string): Promise<VerificationRequestResult> {
  return postJson<VerificationRequestResult>("/api/v1/auth/email/verification/", {}, token);
}

/**
 * Confirma el código de verificación del correo.
 * @param token - JWT cifrado vigente.
 * @param code - Seis cifras recibidas por correo (solo en tránsito).
 */
export function confirmEmailVerification(token: string, code: string): Promise<OkResult> {
  return postJson<OkResult>("/api/v1/auth/email/verification/confirm/", { code }, token);
}

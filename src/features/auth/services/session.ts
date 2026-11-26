/**
 * Sesión del navegador.
 *
 * Propósito: guardar el token solo mientras la pestaña sigue abierta.
 * Contexto: no se escribe en código ni en almacenamiento permanente. Registra
 * su lectura en el cliente HTTP para que una solicitud que salió con un token
 * rotado se reintente una vez con el vigente (F10.2-CORRECCIONES).
 * @author Cristian Deysdayr Jimenez
 */

import { setSessionTokenReader } from "../../../services/api/client.ts";
import { dropSessionMemory } from "../../../services/sessionMemory.ts";

const key = "agrotech.token";
const issuedKey = "agrotech.token-at";

/** @param token - JWT cifrado devuelto por el login. */
export function saveToken(token: string): void {
  sessionStorage.setItem(key, token);
  sessionStorage.setItem(issuedKey, String(Date.now()));
}

/** @returns Milisegundos en que se guardó el token, o 0 si no hay marca. */
export function readTokenIssuedAt(): number {
  return Number(sessionStorage.getItem(issuedKey) || "0");
}

/** @returns Token vigente o cadena vacía. */
export function readToken(): string {
  return sessionStorage.getItem(key) ?? "";
}

/** Olvida la sesión local. */
export function clearToken(): void {
  sessionStorage.removeItem(key);
  sessionStorage.removeItem(issuedKey);
  dropSessionMemory();
}

setSessionTokenReader(readToken);

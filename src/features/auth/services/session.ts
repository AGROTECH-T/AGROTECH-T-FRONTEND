/**
 * Sesión del navegador.
 *
 * Propósito: guardar el token solo mientras la pestaña sigue abierta.
 * Contexto: no se escribe en código ni en almacenamiento permanente.
 * @author Cristian Deysdayr Jimenez
 */

const key = "agrotech.token";

/** @param token - JWT cifrado devuelto por el login. */
export function saveToken(token: string): void {
  sessionStorage.setItem(key, token);
}

/** @returns Token vigente o cadena vacía. */
export function readToken(): string {
  return sessionStorage.getItem(key) ?? "";
}

/** Olvida la sesión local. */
export function clearToken(): void {
  sessionStorage.removeItem(key);
}

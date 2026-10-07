/**
 * Datos que salen del formulario hacia el login.
 *
 * Propósito: normalizar la identificación antes de enviarla.
 * Contexto: el backend compara el documento sin espacios.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * Arma el cuerpo de inicio de sesión.
 * @param identification - Documento tal como lo escribió la persona.
 * @param password - Contraseña sin recortar.
 * @returns Cuerpo listo para POST /api/v1/auth/login/.
 * @example loginPayload(" 12345678 ", "Secure1!")
 */
export function loginPayload(identification: string, password: string) {
  return { identification: identification.trim(), password };
}

/**
 * Marca de un correo.
 *
 * Propósito: saber si el texto ya incluye la arroba.
 * Contexto: guía visual del campo de correo, sin bloquear la escritura.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * Indica si el correo lleva @.
 * @param value - Texto que la persona está escribiendo.
 * @returns Verdadero cuando aparece la arroba.
 */
export function hasAtSign(value: string): boolean {
  return value.includes("@");
}

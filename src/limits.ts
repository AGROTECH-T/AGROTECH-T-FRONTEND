/**
 * Tope de los textos cortos.
 *
 * Propósito: nombres, lugares, códigos y correos no pasan de 25.
 * Contexto: las observaciones conservan su propio máximo.
 * @author Cristian Deysdayr Jimenez
 */

export const TEXT_MAX = 25;

/**
 * Permite conservar un texto que ya era más largo y corta lo nuevo en 25.
 * @param value - Texto actual del campo.
 * @returns El máximo que el campo puede aceptar ahora.
 */
export function textCap(value: string): number {
  return Math.max(TEXT_MAX, value.length);
}

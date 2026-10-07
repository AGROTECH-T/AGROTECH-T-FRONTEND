/**
 * Avisos de cada campo.
 *
 * Propósito: explicar con un ejemplo qué acepta el dato.
 * Contexto: el mismo texto va en el campo y en la notificación.
 * @author Cristian Deysdayr Jimenez
 */

import { passwordRules } from "./passwordRules.ts";

const LETTERS = /^\p{L}+(?: \p{L}+)*$/u;
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD = "8 caracteres, una mayúscula, una minúscula, un número y un signo.";

/**
 * Exige solo letras.
 * @param value - Nombre escrito.
 * @param example - Muestra, como Ana o García.
 * @returns El aviso, o vacío si el nombre es válido.
 */
export function lettersMessage(value: string, example: string): string {
  return LETTERS.test(value.trim()) ? "" : `Solo letras. Ejemplo: ${example}`;
}

/**
 * Exige solo números dentro de un largo.
 * @param value - Dígitos escritos.
 * @param example - Muestra numérica.
 * @param min - Cantidad mínima.
 * @param max - Cantidad máxima.
 * @returns El aviso, o vacío si el número es válido.
 */
export function digitsMessage(value: string, example: string, min: number, max: number): string {
  const text = value.trim();
  const valid = /^\d+$/.test(text) && text.length >= min && text.length <= max;
  return valid ? "" : `Solo números. Ejemplo: ${example}`;
}

/**
 * Exige un correo con arroba.
 * @param value - Correo en edición.
 * @returns El aviso si no lleva el signo @.
 */
export function mailMessage(value: string): string {
  return MAIL.test(value.trim()) ? "" : "Solo se acepta con el signo @. Ejemplo: ana@correo.com";
}

/**
 * Exige una contraseña con las cinco reglas.
 * @param value - Contraseña en edición.
 * @returns El aviso si falta algún requisito.
 */
export function passwordMessage(value: string): string {
  const pending = !value || passwordRules(value).some((rule) => !rule.met);
  return pending ? PASSWORD : "";
}

/**
 * Pide la contraseña de una cuenta que ya existe.
 * @param value - Contraseña escrita.
 * @returns El aviso si el campo está vacío.
 */
export function loginPasswordMessage(value: string): string {
  return value ? "" : "Escribe la contraseña.";
}

/**
 * Arma el texto de la notificación con el nombre del campo.
 * @param field - Nombre visible, como primer nombre.
 * @param detail - Regla que falló en ese campo.
 * @returns El aviso completo, o vacío si no hay error.
 */
export function reviewField(field: string, detail: string): string {
  return detail ? `Revisa el campo de ${field}. ${detail}` : "";
}

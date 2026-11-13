/**
 * Alta de una finca.
 *
 * Propósito: validar el nombre y traducir la respuesta de POST /api/v1/farms/
 * a un resultado visible, compartido por Fincas y el onboarding.
 * Contexto: el modelo Farm solo admite `name` (máx. 100). El backend exige
 * cuenta activa y correo verificado, y la capacidad `can_create_farms` o la
 * excepción de primera finca (F10.2); responde 403 si no se cumple.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Farm } from "../types/index.ts";

export const NAME_MAX_LENGTH = 100;
export const EMAIL_UNVERIFIED_SERVER = "verifica tu correo para crear fincas";
export const UNVERIFIED_MESSAGE = "Verifica tu correo para crear fincas.";
export const FORBIDDEN_MESSAGE = "Tu cuenta no tiene permiso para crear fincas.";
export const SESSION_MESSAGE = "Tu sesión terminó. Vuelve a iniciar sesión.";
export const NETWORK_MESSAGE =
  "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.";
export const FALLBACK_MESSAGE = "No se pudo crear la finca";

/**
 * Valida el nombre en cliente (mismo criterio básico que el backend).
 * @param name - Texto escrito.
 * @returns Aviso o cadena vacía.
 */
export function nameMessage(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Escribe el nombre de la finca.";
  if (trimmed.length > NAME_MAX_LENGTH) return "El nombre no puede superar 100 caracteres.";
  return "";
}

export type FarmCreationResult =
  | { kind: "invalid"; message: string }
  | { kind: "created"; farm: Farm }
  | { kind: "error"; message: string };

/** @returns Mensaje visible para un error de creación. */
export function farmCreationError(cause: unknown): string {
  if (!isApiError(cause)) return NETWORK_MESSAGE;
  if (cause.status === 401) return SESSION_MESSAGE;
  if (cause.status === 403) {
    return cause.serverMessage === EMAIL_UNVERIFIED_SERVER ? UNVERIFIED_MESSAGE : FORBIDDEN_MESSAGE;
  }
  return cause.message || FALLBACK_MESSAGE;
}

/**
 * Valida y crea la finca; nunca lanza.
 * @param name - Nombre escrito.
 * @param create - Llamada HTTP (createFarm, inyectable en pruebas).
 */
export async function runFarmCreation(
  name: string,
  create: (name: string) => Promise<Farm>,
): Promise<FarmCreationResult> {
  const invalid = nameMessage(name);
  if (invalid) return { kind: "invalid", message: invalid };
  try {
    return { kind: "created", farm: await create(name.trim()) };
  } catch (cause) {
    return { kind: "error", message: farmCreationError(cause) };
  }
}

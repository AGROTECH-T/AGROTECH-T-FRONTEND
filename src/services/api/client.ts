/**
 * Cliente HTTP compartido.
 *
 * Propósito: enviar JSON y traducir el error del backend.
 * Contexto: la API responde {"error": "mensaje"} cuando algo falla; algunos
 * errores añaden campos (por ejemplo `invitation_id` en un 502 de entrega).
 * @author Cristian Deysdayr Jimenez
 */

import { apiRoot } from "./config.ts";
import { limitNotice } from "./limitNotice.ts";

const FALLBACK_MESSAGE = "No se pudo completar la solicitud";

/** Campos adicionales que acompañan al mensaje de error del backend. */
export type ApiErrorExtra = Record<string, unknown>;

/**
 * Error de una respuesta HTTP no exitosa.
 *
 * Conserva el código HTTP, el mensaje del servidor (ya legible) y cualquier
 * campo adicional del cuerpo. Extiende `Error`, así que el código existente
 * que solo lee `message` sigue funcionando.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly serverMessage: string;
  readonly extra: ApiErrorExtra;

  constructor(status: number, serverMessage: string, extra: ApiErrorExtra = {}) {
    super(limitNotice(serverMessage));
    this.name = "ApiError";
    this.status = status;
    this.serverMessage = serverMessage;
    this.extra = extra;
  }

  /** @returns true si la sesión falta o es inválida (401). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** @returns true si los datos enviados no son válidos (400). */
  get isBadRequest(): boolean {
    return this.status === 400;
  }

  /** @returns true si la cuenta no tiene permiso (403). */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** @returns true si el recurso no existe o no es visible (404). */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** @returns true si la operación entra en conflicto con el estado (409). */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** @returns true si se alcanzó un límite de frecuencia (429). */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** @returns true si falló un servicio externo, p. ej. el correo (502). */
  get isBadGateway(): boolean {
    return this.status === 502;
  }
}

/**
 * Indica si un valor es un ApiError, opcionalmente con un código concreto.
 * @param value - Error capturado.
 * @param status - Código HTTP esperado (opcional).
 */
export function isApiError(value: unknown, status?: number): value is ApiError {
  return value instanceof ApiError && (status === undefined || value.status === status);
}

/**
 * Construye un ApiError a partir del código y del cuerpo ya interpretado.
 * @param status - Código HTTP.
 * @param body - Cuerpo JSON (o cualquier valor si no era JSON).
 */
export function toApiError(status: number, body: unknown): ApiError {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const { error, ...extra } = body as Record<string, unknown>;
    const message = typeof error === "string" && error ? error : FALLBACK_MESSAGE;
    return new ApiError(status, message, extra);
  }
  return new ApiError(status, FALLBACK_MESSAGE);
}

/**
 * Envía JSON y devuelve el cuerpo si la respuesta es exitosa.
 * @param path - Ruta desde el origen, por ejemplo /api/v1/auth/login/.
 * @param body - Cuerpo ya preparado por el dominio.
 * @param token - Sesión Bearer, solo si el endpoint la exige.
 * @returns Cuerpo JSON de la respuesta (undefined si es 204).
 */
export async function postJson<T>(
  path: string,
  body: unknown,
  token = "",
  options: SendOptions = {},
): Promise<T> {
  return send<T>(path, { method: "POST", body: JSON.stringify(body) }, token, options);
}

/**
 * Envía un cambio parcial y devuelve el cuerpo si la respuesta es exitosa.
 * @param path - Ruta desde el origen, por ejemplo /api/v1/auth/me/.
 * @param body - Campos que cambian.
 * @param token - Sesión Bearer.
 * @returns Cuerpo JSON de la respuesta.
 */
export function patchJson<T>(path: string, body: unknown, token: string): Promise<T> {
  return send<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token);
}

/**
 * Reemplaza un recurso y devuelve el cuerpo si la respuesta es exitosa.
 * @param path - Ruta desde el origen.
 * @param body - Cuerpo completo del recurso.
 * @param token - Sesión Bearer.
 * @returns Cuerpo JSON de la respuesta.
 */
export function putJson<T>(path: string, body: unknown, token: string): Promise<T> {
  return send<T>(path, { method: "PUT", body: JSON.stringify(body) }, token);
}

/**
 * Consulta un recurso JSON.
 * @param path - Ruta desde el origen.
 * @param token - Sesión Bearer.
 * @returns Cuerpo JSON de la respuesta.
 */
export function getJson<T>(path: string, token: string): Promise<T> {
  return send<T>(path, { method: "GET" }, token);
}

/**
 * Elimina un recurso.
 * @param path - Ruta desde el origen.
 * @param token - Sesión Bearer.
 * @param body - Cuerpo opcional (p. ej. motivo de revocación).
 */
export async function deleteJson(path: string, token: string, body?: unknown): Promise<void> {
  const init: RequestInit = { method: "DELETE" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  await send<unknown>(path, init, token);
}

/** Mensaje del backend cuando el Bearer no autentica (JWEAuthentication). */
export const SESSION_EXPIRED_SERVER_MESSAGE = "la sesion vencio";

export type SendOptions = {
  /**
   * false para no reintentar tras una rotación (la propia renovación).
   * Por defecto se reintenta una vez si el token de la pestaña cambió.
   */
  retryOnRotation?: boolean;
};

let sessionTokenReader: (() => string) | null = null;

/**
 * Registra cómo leer el token vigente de la pestaña (lo hace session.ts).
 * Permite reintentar una solicitud que salió con un token que se rotó
 * mientras viajaba.
 * @param reader - Lectura del token, o null para desactivar.
 */
export function setSessionTokenReader(reader: (() => string) | null): void {
  sessionTokenReader = reader;
}

/**
 * Token con el que reintentar, o "" si no corresponde.
 * Solo un 401 de autenticación ("la sesion vencio") y solo si el token de la
 * pestaña ya no es el enviado: el backend rechaza en la autenticación, antes
 * de ejecutar la vista, así que la solicitud no tuvo efectos. Otros 401 (p. ej.
 * un código de verificación incorrecto) nunca se reintentan.
 */
function rotatedToken(error: ApiError, sent: string, options: SendOptions): string {
  if (options.retryOnRotation === false || !sent || !sessionTokenReader) return "";
  if (error.status !== 401 || error.serverMessage !== SESSION_EXPIRED_SERVER_MESSAGE) return "";
  let current = "";
  try {
    current = sessionTokenReader();
  } catch {
    return "";
  }
  return current && current !== sent ? current : "";
}

async function send<T>(
  path: string,
  init: RequestInit,
  token: string,
  options: SendOptions = {},
): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiRoot()}${path}`, { ...init, headers });
  const data = await readBody(response);
  if (!response.ok) {
    const error = toApiError(response.status, data);
    const retryWith = rotatedToken(error, token, options);
    if (retryWith) return send<T>(path, init, retryWith, { retryOnRotation: false });
    throw error;
  }
  return data as T;
}

/**
 * Lee el cuerpo sin fallar cuando no hay contenido (204/205) o no es JSON.
 * @param response - Respuesta de fetch.
 * @returns Cuerpo interpretado, o undefined si no hay contenido.
 */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

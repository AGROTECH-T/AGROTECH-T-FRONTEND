/**
 * Cliente HTTP compartido.
 *
 * Propósito: enviar JSON y traducir el error del backend.
 * Contexto: la API responde {"error": "mensaje"} cuando algo falla.
 * @author Cristian Deysdayr Jimenez
 */

import { readToken, readTokenIssuedAt, saveToken } from "../../features/auth/services/session.ts";
import { apiRoot } from "./config.ts";
import { limitNotice } from "./limitNotice.ts";

const RENEW_AFTER_MS = 5 * 60 * 1000;
let renewing: Promise<void> | null = null;
let renewFailedAt = 0;

/**
 * Envía JSON y devuelve el cuerpo si la respuesta es exitosa.
 * @param path - Ruta desde el origen, por ejemplo /api/v1/auth/login/.
 * @param body - Cuerpo ya preparado por el dominio.
 * @param token - Sesión Bearer, solo si el endpoint la exige.
 * @returns Cuerpo JSON de la respuesta.
 */
export async function postJson<T>(path: string, body: unknown, token = ""): Promise<T> {
  return send<T>(path, { method: "POST", body: JSON.stringify(body) }, token);
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
export function getJson<T>(path: string, token: string, cache?: RequestCache): Promise<T> {
  return send<T>(path, { method: "GET", cache }, token);
}

/**
 * Elimina un recurso.
 * @param path - Ruta desde el origen.
 * @param token - Sesión Bearer.
 */
export async function deleteJson(path: string, token: string): Promise<void> {
  const current = await freshToken(token);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (current) headers.set("Authorization", `Bearer ${current}`);
  const response = await fetch(`${apiRoot()}${path}`, { method: "DELETE", headers });
  if (response.status === 204 || response.status === 205) return;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(limitNotice(data.error ?? "No se pudo completar la solicitud"));
  }
}

async function send<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const current = await freshToken(token);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (current) headers.set("Authorization", `Bearer ${current}`);
  const response = await fetch(`${apiRoot()}${path}`, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(limitNotice(data.error ?? "No se pudo completar la solicitud"));
  }
  return data as T;
}

/**
 * Pide otro token si el actual ya lleva rato en uso.
 * La sesión del servidor dura 15 minutos desde que se emitió.
 * @param token - Token que iba a salir en la petición.
 * @returns El token vigente, renovado si ya tocaba.
 */
async function freshToken(token: string): Promise<string> {
  if (!token) return "";
  const issued = readTokenIssuedAt();
  const due = issued === 0 || Date.now() - issued >= RENEW_AFTER_MS;
  if (!due || Date.now() - renewFailedAt < 30_000) return readToken() || token;
  renewing ??= renewSession(token).finally(() => {
    renewing = null;
  });
  await renewing;
  return readToken() || token;
}

async function renewSession(token: string): Promise<void> {
  const response = await fetch(`${apiRoot()}/api/v1/auth/session/renew/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    renewFailedAt = Date.now();
    return;
  }
  const data = (await response.json()) as { token?: string };
  if (data.token) saveToken(data.token);
}

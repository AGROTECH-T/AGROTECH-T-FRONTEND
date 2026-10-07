/**
 * Cliente HTTP compartido.
 *
 * Propósito: enviar JSON y traducir el error del backend.
 * Contexto: la API responde {"error": "mensaje"} cuando algo falla.
 * @author Cristian Deysdayr Jimenez
 */

import { apiRoot } from "./config.ts";
import { limitNotice } from "./limitNotice.ts";

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
 * Consulta un recurso JSON.
 * @param path - Ruta desde el origen.
 * @param token - Sesión Bearer.
 * @returns Cuerpo JSON de la respuesta.
 */
export function getJson<T>(path: string, token: string): Promise<T> {
  return send<T>(path, { method: "GET" }, token);
}

async function send<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiRoot()}${path}`, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(limitNotice(data.error ?? "No se pudo completar la solicitud"));
  }
  return data as T;
}

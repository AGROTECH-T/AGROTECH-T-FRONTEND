/**
 * Origen de la API.
 *
 * Propósito: leer la URL del backend desde el entorno.
 * Contexto: en desarrollo (`vite dev`) sin `VITE_API_URL` se usa el contenedor
 * local publicado en el puerto 8090. En un build de producción la variable es
 * obligatoria: si falta, o si apunta a `localhost` mientras la página se sirve
 * desde un dominio público, ninguna solicitud sale en silencio: falla con un
 * error explícito.
 * @author Cristian Deysdayr Jimenez
 */

import { apiUrlProblem, isLoopbackHost } from "./apiUrlCheck.ts";

/** URL local usada solo cuando Vite corre en modo desarrollo. */
export const DEV_API_FALLBACK = "http://localhost:8090";

export const MISSING_API_URL_MESSAGE =
  "Falta configurar VITE_API_URL: esta versión del frontend no sabe a qué backend conectarse.";

export const LOOPBACK_API_URL_MESSAGE =
  "VITE_API_URL apunta a localhost, pero esta página no se sirve desde este equipo: configura la URL pública del backend.";

export const INVALID_API_URL_MESSAGE = "VITE_API_URL no es una URL http(s) válida.";

/** La aplicación se compiló sin una URL de backend utilizable. */
export class ApiConfigError extends Error {
  constructor(message = MISSING_API_URL_MESSAGE) {
    super(message);
    this.name = "ApiConfigError";
  }
}

/**
 * @property pageHost - `location.hostname` de la página; si se omite no se
 *   compara con la URL configurada.
 */
export type ApiEnv = { VITE_API_URL?: string; DEV: boolean; pageHost?: string };

/**
 * Resuelve la URL base sin barra final.
 * @param env - Variables de Vite (inyectable para pruebas).
 * @throws ApiConfigError fuera de desarrollo si la URL falta, no es válida o
 *   apunta a loopback mientras la página se sirve desde otro host.
 */
export function resolveApiRoot(env: ApiEnv): string {
  const configured = env.VITE_API_URL?.trim() ?? "";
  if (!configured) {
    if (env.DEV) return DEV_API_FALLBACK;
    throw new ApiConfigError();
  }
  if (!env.DEV) {
    const problem = apiUrlProblem(configured);
    if (problem === "invalid") throw new ApiConfigError(INVALID_API_URL_MESSAGE);
    if (problem === "loopback" && env.pageHost !== undefined && !isLoopbackHost(env.pageHost)) {
      throw new ApiConfigError(LOOPBACK_API_URL_MESSAGE);
    }
  }
  return configured.replace(/\/+$/, "");
}

/** @returns URL base sin barra final. */
export function apiRoot(): string {
  return resolveApiRoot({
    VITE_API_URL: import.meta.env.VITE_API_URL,
    DEV: import.meta.env.DEV,
    pageHost: typeof location === "undefined" ? undefined : location.hostname,
  });
}

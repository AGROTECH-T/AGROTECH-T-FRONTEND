/**
 * Origen de la API.
 *
 * Propósito: leer la URL del backend desde el entorno.
 * Contexto: en local apunta al contenedor publicado en el puerto 8090.
 * @author Cristian Deysdayr Jimenez
 */

/** @returns URL base sin barra final. */
export function apiRoot(): string {
  const configured = import.meta.env.VITE_API_URL ?? "http://localhost:8090";
  return configured.replace(/\/$/, "");
}

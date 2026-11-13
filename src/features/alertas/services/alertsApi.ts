/**
 * Cliente HTTP de los avisos.
 *
 * Propósito: traer los productos en o bajo el mínimo de las fincas.
 * Contexto: se calculan al vuelo; no hay avisos guardados.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { AlertList } from "../types/index.ts";

/**
 * Avisos de stock del usuario.
 * @returns Productos agotados o por debajo del mínimo.
 */
export function listAlerts(): Promise<AlertList> {
  return getJson<AlertList>("/api/v1/alerts/", readToken(), "no-store");
}

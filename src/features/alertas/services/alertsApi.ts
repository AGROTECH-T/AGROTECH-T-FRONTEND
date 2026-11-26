/**
 * Cliente HTTP de los avisos.
 *
 * Propósito: traer los productos en o bajo el mínimo de las fincas.
 * Contexto: se calculan al vuelo; no hay avisos guardados.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson } from "../../../services/api/client.ts";
import { onSessionEnd } from "../../../services/sessionMemory.ts";
import { readToken } from "../../auth/services/session.ts";
import type { AlertList } from "../types/index.ts";

const FRESH_MS = 20_000;

let alertsEntry: { at: number; promise: Promise<AlertList>; snap?: AlertList } | null = null;

/** Avisos ya traídos, para pintar Inicio sin la espera. */
export function alertsNow(): AlertList | null {
  return alertsEntry?.snap ?? null;
}

/** Obliga a volver a pedir los avisos. */
export function forgetAlerts(): void {
  alertsEntry = null;
}

onSessionEnd(forgetAlerts);

/**
 * Avisos de stock del usuario.
 * Durante unos segundos se reutiliza la última respuesta.
 * @returns Productos agotados o por debajo del mínimo.
 */
export function listAlerts(): Promise<AlertList> {
  if (alertsEntry && Date.now() - alertsEntry.at < FRESH_MS) return alertsEntry.promise;
  const at = Date.now();
  const promise = getJson<AlertList>("/api/v1/alerts/", readToken(), "no-store")
    .then((data) => {
      if (alertsEntry?.promise === promise) alertsEntry.snap = data;
      return data;
    })
    .catch((error: unknown) => {
      if (alertsEntry?.promise === promise) alertsEntry = null;
      throw error;
    });
  alertsEntry = { at, promise };
  return promise;
}

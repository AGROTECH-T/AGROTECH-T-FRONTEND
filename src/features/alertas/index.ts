/**
 * Feature de alertas.
 *
 * Propósito: exponer los avisos de stock y sus tipos.
 * @author Cristian Deysdayr Jimenez
 */

export { listAlerts } from "./services/alertsApi.ts";
export type { Alert, AlertKind, AlertList } from "./types/index.ts";

/**
 * Resumen de Inicio.
 *
 * Propósito: separar stock bajo y bitácora pendiente sin saturar la vista.
 * Contexto: reutiliza GET /api/v1/alerts/; solo presenta conteos y unas pocas filas.
 * @author Cristian Deysdayr Jimenez
 */

import type { Alert } from "../../alertas/types/index.ts";

/** Máximo de filas visibles por bloque en Inicio. */
export const HOME_PREVIEW_LIMIT = 2;

export type HomeOverview = {
  stock: Alert[];
  stockTotal: number;
  bitacora: Alert[];
  bitacoraTotal: number;
};

/**
 * Parte los avisos en bloques útiles para Inicio.
 * @param alerts - Lista completa del backend.
 * @param limit - Filas a mostrar por bloque.
 */
export function splitHomeAlerts(
  alerts: readonly Alert[],
  limit = HOME_PREVIEW_LIMIT,
): HomeOverview {
  const stock = alerts.filter((item) => item.kind === "bajo" || item.kind === "agotado");
  const bitacora = alerts.filter((item) => item.kind === "bitacora");
  return {
    stock: stock.slice(0, limit),
    stockTotal: stock.length,
    bitacora: bitacora.slice(0, limit),
    bitacoraTotal: bitacora.length,
  };
}

/**
 * Texto corto cuando hay más avisos de los mostrados.
 * @param shown - Filas visibles.
 * @param total - Total real.
 */
export function moreLabel(shown: number, total: number): string | null {
  const rest = total - shown;
  if (rest <= 0) return null;
  return rest === 1 ? "y 1 más" : `y ${rest} más`;
}

/**
 * Motivos del ajuste de inventario.
 *
 * Propósito: una sola lista para el formulario y los filtros del reporte.
 * Contexto: los valores deben coincidir con los del backend.
 * @author Cristian Deysdayr Jimenez
 */

import type { AdjustmentReason } from "../types/index.ts";

export const ADJUSTMENT_REASONS: { id: AdjustmentReason; label: string }[] = [
  { id: "conteo_fisico", label: "Conteo físico" },
  { id: "merma_humedad", label: "Merma por humedad" },
  { id: "dano_plaga", label: "Daño o plaga" },
  { id: "vencimiento", label: "Vencimiento" },
  { id: "robo_perdida", label: "Robo o pérdida" },
  { id: "consumo_no_registrado", label: "Consumo no registrado" },
  { id: "otro", label: "Otro" },
];

/**
 * Texto del motivo para mostrar en tablas y resúmenes.
 * @param reason - Código del motivo.
 * @param fallback - Texto cuando el ajuste es viejo y no tiene motivo.
 * @returns Nombre visible del motivo.
 */
export function reasonLabel(reason: string, fallback = "Sin motivo"): string {
  if (!reason) return fallback;
  return ADJUSTMENT_REASONS.find((item) => item.id === reason)?.label ?? fallback;
}

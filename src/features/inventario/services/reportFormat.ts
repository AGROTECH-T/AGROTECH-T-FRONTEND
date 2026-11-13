/**
 * Formatos de los reportes.
 *
 * Propósito: mostrar fechas, cantidades y variaciones igual en las tablas.
 * @author Cristian Deysdayr Jimenez
 */

import { displayQuantity } from "./equivalence.ts";

/**
 * Fecha y hora de un movimiento.
 * @param iso - Texto ISO que llega del API.
 * @returns Fecha corta con hora, o el mismo texto si no es válido.
 */
export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return iso || "—";
  return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Fecha sin hora.
 * @param iso - Texto ISO que llega del API.
 * @returns Fecha legible.
 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-CO", { dateStyle: "medium" });
}

/**
 * Cantidad con su unidad.
 * @param value - Cantidad tal como llega del API.
 * @param unit - Unidad o símbolo.
 * @returns Texto listo para la tabla.
 */
export function quantityText(value: string, unit: string): string {
  return `${displayQuantity(value, "continua")} ${unit}`.trim();
}

/**
 * Cantidad con signo, para las diferencias.
 * @param value - Diferencia con signo.
 * @param unit - Unidad o símbolo.
 * @returns Texto con + o −.
 */
export function signedText(value: string, unit: string): string {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return quantityText("0", unit);
  const text = displayQuantity(String(Math.abs(number)), "continua");
  return `${number > 0 ? "+" : "−"}${text} ${unit}`;
}

/**
 * Variación contra el periodo anterior.
 * @param value - Porcentaje ya calculado, o null si no hay con qué comparar.
 * @returns Texto con signo.
 */
export function variationText(value: number | null): string {
  if (value === null) return "Sin comparación";
  if (value === 0) return "Igual";
  return `${value > 0 ? "+" : ""}${value}%`;
}

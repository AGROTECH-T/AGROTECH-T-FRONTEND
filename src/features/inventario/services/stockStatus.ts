/**
 * Estado visual del stock.
 *
 * Propósito: marcar OK, bajo o agotado según mínimo y cantidad.
 * @author Cristian Deysdayr Jimenez
 */

export type StockStatus = "ok" | "bajo" | "agotado";

/**
 * Calcula el estado a partir de cantidad y mínimo.
 * @param quantity - Stock actual.
 * @param minStock - Umbral de alerta.
 * @returns Etiqueta de estado.
 */
export function stockStatus(quantity: string, minStock: string): StockStatus {
  const qty = Number(quantity);
  const min = Number(minStock);
  if (!Number.isFinite(qty) || qty <= 0) return "agotado";
  if (Number.isFinite(min) && qty <= min) return "bajo";
  return "ok";
}

/**
 * Texto visible del estado.
 * @param status - Estado calculado.
 * @returns Etiqueta en español.
 */
export function stockStatusLabel(status: StockStatus): string {
  if (status === "agotado") return "Agotado";
  if (status === "bajo") return "Bajo";
  return "OK";
}

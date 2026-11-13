/**
 * Cantidad de entrada o salida.
 *
 * Propósito: aceptar enteros o decimales según la unidad del producto.
 * @author Cristian Deysdayr Jimenez
 */

import type { Product } from "../types/index.ts";

/**
 * Normaliza la coma decimal a punto.
 * @param raw - Texto escrito en la fila.
 * @returns Cantidad lista para validar y guardar.
 */
export function normalizeAmount(raw: string): string {
  return raw.trim().replace(",", ".");
}

/**
 * Aviso de la cantidad, o vacío si se puede guardar.
 * @param product - Producto de esa fila.
 * @param raw - Cantidad escrita.
 * @param kind - Entrada o salida.
 * @returns Texto en rojo, o vacío.
 */
export function movementAmountMessage(
  product: Product,
  raw: string,
  kind: "entrada" | "salida",
): string {
  const text = normalizeAmount(raw);
  if (!text) return "";
  if (!/^\d+(\.\d+)?$/.test(text)) return "Escribe la cantidad.";
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return "La cantidad debe ser mayor que cero.";
  if (kind === "salida" && value > Number(product.quantity)) return "No hay suficiente stock.";
  const places = allowedPlaces(product);
  const fraction = (text.split(".")[1] ?? "").replace(/0+$/, "");
  if (places === 0 && fraction.length > 0) return "Esta unidad solo admite cantidades enteras.";
  if (fraction.length > places) return `Esta unidad admite como máximo ${places} decimales.`;
  return "";
}

/**
 * Decimales que admite la unidad.
 * La presentación, como el bulto, admite el medio. La unidad no.
 * @param product - Producto de esa fila.
 * @returns Cantidad de decimales permitidos.
 */
function allowedPlaces(product: Product): number {
  if (product.unit_nature === "presentacion") return 1;
  if (product.unit_nature === "discreta") return 0;
  return product.unit_decimal_places;
}

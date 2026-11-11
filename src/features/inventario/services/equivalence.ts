/**
 * Equivalencia visible de una cantidad.
 *
 * Propósito: mostrar bultos, gramos o mililitros también en kg o L.
 * @author Cristian Deysdayr Jimenez
 */

import type { MagnitudeNature } from "../types/index.ts";

/**
 * Indica si la unidad se cuenta de a uno para el ajuste y la mitad.
 * @param nature - Naturaleza de la unidad.
 * @returns Verdadero en unidad, bulto y demás presentaciones.
 */
export function isWholeUnit(nature: MagnitudeNature | string): boolean {
  return nature === "discreta" || nature === "presentacion";
}

/**
 * Texto de cantidad para lista y stock, sin ceros de relleno.
 * @param quantity - Cantidad tal como llega del API.
 * @param nature - Naturaleza de la unidad.
 * @returns Cantidad legible.
 */
export function displayQuantity(quantity: string, nature: MagnitudeNature | string): string {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return quantity;
  if (nature === "discreta") return String(Math.trunc(value));
  return trim(value);
}

/**
 * Conversión a unidad base, o a kg/L cuando la base es g o mL.
 * @param amount - Cantidad escrita por el operador.
 * @param factor - Factor de la presentación.
 * @param baseSymbol - Símbolo de la unidad base.
 * @returns Texto "80 kg" o null si ya está en esa unidad.
 */
export function equivalenceText(
  amount: string,
  factor: string,
  baseSymbol: string,
): string | null {
  if (!amount.trim()) return null;
  const qty = Number(amount);
  const fac = Number(factor);
  if (!Number.isFinite(qty) || !Number.isFinite(fac)) return null;
  let value = qty * fac;
  let symbol = baseSymbol;
  if (baseSymbol === "g") {
    value /= 1000;
    symbol = "kg";
  } else if (baseSymbol === "mL") {
    value /= 1000;
    symbol = "L";
  } else if (fac === 1) {
    return null;
  }
  return `${trim(value)} ${symbol}`;
}

/**
 * Mitad del stock, entera si la unidad se cuenta.
 * @param quantity - Stock actual.
 * @param nature - Naturaleza de la unidad.
 * @param decimals - Precisión si es continua.
 * @returns Cantidad o null si no alcanza para una mitad útil.
 */
export function halfStock(
  quantity: string,
  nature: MagnitudeNature | string,
  decimals: number,
): string | null {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (isWholeUnit(nature)) {
    const whole = Math.floor(qty / 2);
    return whole >= 1 ? String(whole) : null;
  }
  const places = Math.max(0, decimals);
  const scale = 10 ** places;
  const halved = Math.round((qty / 2) * scale) / scale;
  if (halved <= 0) return null;
  return trim(halved);
}

function trim(value: number): string {
  return value.toFixed(3).replace(/\.?0+$/, "");
}

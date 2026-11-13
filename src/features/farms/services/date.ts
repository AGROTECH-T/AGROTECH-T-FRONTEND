/**
 * Formato de fechas del dominio de fincas.
 *
 * Propósito: unificar la presentación de fechas y horas en español.
 * @author Cristian Deysdayr Jimenez
 */

/** @param value - Fecha ISO. @returns Texto legible o el valor original si es inválido. */
export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

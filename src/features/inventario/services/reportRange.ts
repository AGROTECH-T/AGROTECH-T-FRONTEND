/**
 * Rango de fechas de los reportes.
 *
 * Propósito: abrir los reportes con un periodo real que se pueda comparar.
 * Contexto: el usuario puede cambiarlo o dejarlo vacío.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * Fecha local en formato AAAA-MM-DD, sin pasar por UTC.
 * @param date - Fecha a convertir.
 * @returns Texto que acepta el campo de fecha.
 */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Periodo por defecto: los últimos días, contando hoy.
 * @param days - Cantidad de días hacia atrás.
 * @returns Desde y hasta en formato AAAA-MM-DD.
 */
export function defaultRange(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

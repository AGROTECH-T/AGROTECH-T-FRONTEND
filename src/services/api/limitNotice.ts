/**
 * Aviso del límite de intentos.
 *
 * Propósito: cambiar el texto técnico del servidor por minutos u horas.
 * Contexto: el alta responde 429 cuando se agota la cuota.
 * @author Cristian Deysdayr Jimenez
 */

const WAIT = /(\d+)\s+segundos?/i;

/**
 * Traduce un 429 al tiempo que falta.
 * @param message - Texto que devolvió la API.
 * @returns El mismo texto, o el aviso de límite si era el del regulador.
 */
export function limitNotice(message: string): string {
  if (!/throttled|regulada|disponible en/i.test(message)) return message;
  const match = WAIT.exec(message);
  if (!match) return "Límite de intentos alcanzado. Inténtalo más tarde.";
  return `Límite de intentos alcanzado. Se restablece en ${span(Number(match[1]))}.`;
}

function span(total: number): string {
  if (total < 60) return "menos de un minuto";
  const minutes = Math.ceil(total / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) {
    return `${count(hours, "hora", "horas")} y ${count(mins, "minuto", "minutos")}`;
  }
  if (hours) return count(hours, "hora", "horas");
  return count(mins, "minuto", "minutos");
}

function count(amount: number, one: string, many: string): string {
  return `${amount} ${amount === 1 ? one : many}`;
}

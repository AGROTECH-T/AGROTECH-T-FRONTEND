/**
 * Memoria de la pestaña para datos que ya se pidieron.
 *
 * Propósito: soltar esas copias al cerrar la sesión.
 * @author Cristian Deysdayr Jimenez
 */

const forgets: Array<() => void> = [];

/** Registra una limpieza que corre al cerrar la sesión. */
export function onSessionEnd(forget: () => void): void {
  forgets.push(forget);
}

/** Borra lo recordado en esta pestaña. */
export function dropSessionMemory(): void {
  for (const forget of forgets) forget();
}

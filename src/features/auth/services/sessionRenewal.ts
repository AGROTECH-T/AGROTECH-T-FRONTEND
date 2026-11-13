/**
 * Renovación de la sesión mientras la persona usa la aplicación.
 *
 * Propósito: evitar que una sesión activa venza a mitad del onboarding sin
 * convertir la renovación en una sesión eterna.
 * Contexto: POST /api/v1/auth/session/renew/ (RenewView, session_service.rotate)
 * recibe el Bearer vigente, lo invalida y entrega uno nuevo con la vigencia
 * completa (JWT_TTL_MINUTES, 15 por defecto, no expuesta al cliente). Solo
 * funciona antes de que el token venza. Aquí se renueva únicamente si hubo
 * actividad (puntero o teclado) desde la última renovación y pasaron al menos
 * RENEW_AFTER_MS; una persona inactiva más que el TTL pierde la sesión, igual
 * que antes. Un 401 al renovar significa sesión terminada.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { LoginResult } from "../types/index.ts";

/** Intervalo mínimo entre renovaciones (menor que el TTL por defecto de 15 min). */
export const RENEW_AFTER_MS = 5 * 60_000;
/** Cada cuánto se comprueba si toca renovar. */
export const RENEW_CHECK_MS = 60_000;
/** Eventos que cuentan como actividad. */
export const ACTIVITY_EVENTS = ["pointerdown", "keydown"] as const;

export type RenewOutcome = "renewed" | "expired" | "failed" | "skipped";

export type RenewerDeps = {
  readToken: () => string;
  saveToken: (token: string) => void;
  renew: (token: string) => Promise<LoginResult>;
  onExpired: () => void;
};

export type Renewer = { renew: () => Promise<RenewOutcome> };

/**
 * Crea un renovador de un solo vuelo.
 * Si el token cambió o se borró mientras la petición viajaba (cierre de
 * sesión, otro login), el resultado se descarta.
 */
export function createSessionRenewer(deps: RenewerDeps): Renewer {
  let inFlight: Promise<RenewOutcome> | null = null;

  async function run(): Promise<RenewOutcome> {
    const token = deps.readToken();
    if (!token) return "skipped";
    try {
      const next = await deps.renew(token);
      if (deps.readToken() !== token) return "skipped";
      deps.saveToken(next.token);
      return "renewed";
    } catch (cause) {
      if (deps.readToken() !== token) return "skipped";
      if (isApiError(cause, 401)) {
        deps.onExpired();
        return "expired";
      }
      return "failed";
    }
  }

  return {
    renew() {
      if (!inFlight) {
        inFlight = run().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}

/**
 * @param now - Momento actual (ms).
 * @param lastActivity - Última actividad registrada.
 * @param lastRenewal - Última renovación (o -Infinity si urge renovar).
 * @returns true si hubo actividad desde la última renovación y ya pasó el intervalo.
 */
export function shouldRenew(now: number, lastActivity: number, lastRenewal: number): boolean {
  return lastActivity > lastRenewal && now - lastRenewal >= RENEW_AFTER_MS;
}

export type ActivityTarget = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export type RenewalOptions = {
  renewer: Renewer;
  /**
   * true para una sesión restaurada tras recargar: no se sabe cuánto le queda,
   * así que se renueva en la primera comprobación (la recarga cuenta como actividad).
   */
  renewSoon: boolean;
  target?: ActivityTarget | null;
  now?: () => number;
  setTimer?: (tick: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

/**
 * Programa la renovación por actividad.
 * @returns Función que detiene la renovación y retira los oyentes.
 */
export function startActivityRenewal({
  renewer,
  renewSoon,
  target = globalThis.window ?? null,
  now = () => Date.now(),
  setTimer = (tick, ms) => globalThis.setInterval(tick, ms),
  clearTimer = (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
}: RenewalOptions): () => void {
  let lastActivity = now();
  let lastRenewal = renewSoon ? Number.NEGATIVE_INFINITY : lastActivity;
  let stopped = false;

  // Renueva y, si falló la red, permite reintentar en la próxima comprobación.
  const attempt = (current: number) => {
    const previous = lastRenewal;
    lastRenewal = current;
    void renewer.renew().then((outcome) => {
      if (outcome === "failed" && !stopped) lastRenewal = previous;
    });
  };
  const check = () => {
    const current = now();
    if (shouldRenew(current, lastActivity, lastRenewal)) attempt(current);
  };
  // La actividad renueva en el acto si ya toca: no espera al siguiente tick,
  // lo que reduce el riesgo de vencer justo antes de la comprobación.
  const mark = () => {
    lastActivity = now();
    check();
  };
  for (const name of ACTIVITY_EVENTS) target?.addEventListener(name, mark, { passive: true });

  const handle = setTimer(check, RENEW_CHECK_MS);

  return () => {
    stopped = true;
    clearTimer(handle);
    for (const name of ACTIVITY_EVENTS) target?.removeEventListener(name, mark);
  };
}

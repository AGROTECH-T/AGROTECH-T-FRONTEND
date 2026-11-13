/**
 * Etapa de la autenticación.
 *
 * Propósito: decidir qué pantalla corresponde según la cuenta, la invitación
 * y el acceso a fincas.
 * Contexto: sin cuenta → acceso; correo sin verificar → verificación (bloquea
 * todo lo demás, también la invitación); invitación pendiente → aceptación;
 * acceso a fincas aún sin comprobar → comprobación; sin fincas → bienvenida
 * (onboarding, F10.2); en otro caso → shell. La invitación se conserva durante
 * la verificación y tiene prioridad sobre la bienvenida.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../types/index.ts";
import { needsEmailVerification } from "./verification.ts";

export type AuthStage = "access" | "verify" | "invitation" | "checking" | "welcome" | "home";

/**
 * Acceso a fincas de la cuenta:
 * - unknown: falta consultar GET /farms/ (o se está consultando).
 * - error: la consulta falló.
 * - none: sin membresías activas ni fincas que administre.
 * - some: tiene acceso; no vuelve al onboarding.
 * - dismissed: la persona eligió ir al inicio sin fincas.
 */
export type FarmAccess = "unknown" | "error" | "none" | "some" | "dismissed";

/**
 * @param account - Cuenta autenticada o null.
 * @param invitation - Token de invitación pendiente o null.
 * @param farmAccess - Acceso a fincas (por defecto "some": comportamiento previo).
 * @returns La etapa visible.
 */
export function authStage(
  account: Pick<Account, "email_verified"> | null,
  invitation: string | null,
  farmAccess: FarmAccess = "some",
): AuthStage {
  if (!account) return "access";
  if (needsEmailVerification(account)) return "verify";
  if (invitation) return "invitation";
  if (farmAccess === "unknown" || farmAccess === "error") return "checking";
  if (farmAccess === "none") return "welcome";
  return "home";
}

/**
 * Traduce el listado de fincas a acceso.
 * GET /farms/ solo trae membresías activas en fincas activas; quien
 * administra una finca desactivada también tiene acceso (can_open_inactive_farms).
 * @param farms - Fincas del listado.
 * @param account - Capacidades globales de la cuenta.
 */
export function farmAccessFrom(
  farms: readonly unknown[],
  account: Pick<Account, "can_open_inactive_farms">,
): FarmAccess {
  return farms.length > 0 || account.can_open_inactive_farms === true ? "some" : "none";
}

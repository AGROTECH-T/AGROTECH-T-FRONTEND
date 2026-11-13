/**
 * Textos de bienvenida de Inicio.
 *
 * Propósito: saludar con el nombre y el apellido de quien entra.
 * Contexto: sección Inicio del shell autenticado.
 * @author Cristian Deysdayr Jimenez
 */

import { accountName } from "../../../components/layout/AccountChip.tsx";
import type { Account } from "../../auth/types/index.ts";

export const HOME_GREETING = "Bienvenido,";

/**
 * Palabra de saludo, sin el nombre.
 * @returns Texto corto de bienvenida.
 */
export function homeGreeting(): string {
  return HOME_GREETING;
}

/**
 * Nombre y apellido de la persona que inició sesión.
 * @param account - Cuenta autenticada.
 * @returns Nombre visible debajo del saludo.
 */
export function homeTitle(account: Account): string {
  return accountName(account);
}

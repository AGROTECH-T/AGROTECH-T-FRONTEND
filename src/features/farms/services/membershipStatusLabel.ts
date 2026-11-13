/**
 * Etiquetas legibles del estado de membresía.
 *
 * Propósito: mostrar el estado en español en la interfaz.
 * Contexto: valores internos que devuelve la API de integrantes.
 * @author Cristian Deysdayr Jimenez
 */

import type { FarmMembershipStatus } from "../types/index.ts";

const LABELS: Record<FarmMembershipStatus, string> = {
  active: "Activa",
  revoked: "Revocada",
  left: "Abandonada",
};

/** @param status - Valor interno. @returns Etiqueta en español. */
export function membershipStatusLabel(status: FarmMembershipStatus): string {
  return LABELS[status] ?? status;
}

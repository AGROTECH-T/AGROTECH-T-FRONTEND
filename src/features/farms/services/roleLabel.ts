/**
 * Etiquetas legibles del rol en una finca.
 *
 * Propósito: mostrar el rol en español en la interfaz.
 * Contexto: valores internos que devuelve Farms v1.
 * @author Cristian Deysdayr Jimenez
 */

import type { FarmRole } from "../types/index.ts";

const LABELS: Record<FarmRole, string> = {
  administrador: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
};

/**
 * Traduce el rol interno a texto de pantalla.
 * @param role - Valor de la API.
 * @returns Etiqueta en español.
 */
export function roleLabel(role: FarmRole): string {
  return LABELS[role] ?? role;
}

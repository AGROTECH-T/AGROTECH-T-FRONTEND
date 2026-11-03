/**
 * Contratos del dominio de fincas.
 *
 * Propósito: tipar lo que devuelve la API de Farms v1.
 * Contexto: listado, creación y detalle con el rol de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

export type FarmRole = "administrador" | "operador" | "consulta";

export type Farm = {
  id: number;
  name: string;
  role: FarmRole;
  created_at: string;
  updated_at: string;
};

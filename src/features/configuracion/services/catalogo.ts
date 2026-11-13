/**
 * Presentación del catálogo de roles y permisos.
 *
 * Propósito: fijar el orden de los roles y las etiquetas de cada estado.
 * Contexto: la vista de Configuración consume estos valores.
 * @author Cristian Deysdayr Jimenez
 */

import type { EstadoPermiso, RolId } from "../types/index.ts";

/** Orden de los roles de finca. */
export const ROLES_ORDEN: readonly RolId[] = ["administrador", "operador", "consulta"];

/** Etiqueta legible de cada estado posible de la matriz. */
export const ESTADO_LABEL: Record<EstadoPermiso, string> = {
  permitido: "Permitido",
  no_permitido: "No permitido",
  condicionado: "Condicionado",
  pendiente: "Pendiente",
  no_requiere: "No requiere rol",
};

/** Nombre visible de cada rol. */
export const ROL_NOMBRE: Record<RolId, string> = {
  administrador: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
};

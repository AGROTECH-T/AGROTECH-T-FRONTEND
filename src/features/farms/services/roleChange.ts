/**
 * Cambio de rol de un integrante.
 *
 * Propósito: textos de confirmación, mensajes de error y actualización del
 * acceso propio tras un PATCH exitoso.
 * Contexto: el backend decide (403/404/409). El frontend no conoce el id de la
 * membresía propia, así que tras cada cambio vuelve a leer GET /farms/{id}/
 * para saber el rol real de la cuenta; nunca compara nombres.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Farm, FarmMember, FarmRole } from "../types/index.ts";
import { roleLabel } from "./roleLabel.ts";

/** Valores exactos que acepta ChangeMemberRoleSerializer. */
export const ROLE_OPTIONS: readonly FarmRole[] = ["administrador", "operador", "consulta"];

/** Solo una membresía activa admite cambio de rol (el backend responde 404 si no). */
export function canChangeRole(member: Pick<FarmMember, "status">): boolean {
  return member.status === "active";
}

/** @returns true si el rol elegido es distinto del actual. */
export function isRoleChange(member: Pick<FarmMember, "role">, next: FarmRole): boolean {
  return member.role !== next;
}

export type RoleChangeCopy = {
  title: string;
  body: string[];
  confirm: string;
  tone: "default" | "warning";
};

/**
 * Textos del diálogo según el cambio.
 * @param member - Integrante con su rol actual.
 * @param next - Rol elegido.
 */
export function roleChangeCopy(member: Pick<FarmMember, "name" | "role">, next: FarmRole): RoleChangeCopy {
  const who = member.name || "este integrante";
  const from = roleLabel(member.role);
  const to = roleLabel(next);

  if (next === "administrador") {
    return {
      title: `¿Promover a ${who} a Administrador?`,
      body: [
        `Pasará de ${from} a Administrador.`,
        "Podrá editar y desactivar la finca, consultar su historial y gestionar a sus integrantes, incluido tu propio rol.",
      ],
      confirm: "Promover a Administrador",
      tone: "warning",
    };
  }

  if (member.role === "administrador") {
    return {
      title: `¿Cambiar a ${who} a ${to}?`,
      body: [
        `Dejará de ser Administrador y pasará a ${to}.`,
        "Si es tu propia membresía, perderás de inmediato las opciones de administración de esta finca.",
        "La finca debe conservar al menos un administrador activo; si no hay otro, el cambio será rechazado.",
      ],
      confirm: `Cambiar a ${to}`,
      tone: "warning",
    };
  }

  return {
    title: `¿Cambiar a ${who} a ${to}?`,
    body: [
      `Pasará de ${from} a ${to}.`,
      next === "consulta"
        ? "Con el rol Consulta tendrá acceso de solo lectura."
        : "Con el rol Operador podrá registrar operaciones, como movimientos de inventario.",
    ],
    confirm: `Cambiar a ${to}`,
    tone: "default",
  };
}

/**
 * Mensaje de error sin ocultar el texto del backend; añade contexto solo en
 * los casos verificados en el servicio change_member_role.
 */
export function roleChangeErrorMessage(cause: unknown, next: FarmRole): string {
  const base = cause instanceof Error && cause.message ? cause.message : "No se pudo cambiar el rol";
  if (isApiError(cause, 409)) {
    return `${base}. Promueve antes a otra persona a Administrador.`;
  }
  if (
    isApiError(cause, 403) &&
    next === "administrador" &&
    cause.serverMessage === "la cuenta no está activa"
  ) {
    return `${base}. Una cuenta inactiva no puede ser administradora.`;
  }
  return base;
}

/** Resultado del PATCH de rol. */
export type RoleSubmit =
  | { status: "ok"; member: FarmMember }
  | { status: "error"; message: string; cause: unknown };

/**
 * Ejecuta el PATCH y traduce el resultado. Un éxito devuelve la membresía
 * que respondió el backend, no el rol elegido en pantalla.
 */
export async function submitRoleChange(
  changeRole: (farmId: number, membershipId: number, role: FarmRole) => Promise<FarmMember>,
  farmId: number,
  membershipId: number,
  role: FarmRole,
): Promise<RoleSubmit> {
  try {
    return { status: "ok", member: await changeRole(farmId, membershipId, role) };
  } catch (cause) {
    return { status: "error", message: roleChangeErrorMessage(cause, role), cause };
  }
}

/** Resultado de releer la finca tras un cambio de rol exitoso. */
export type AccessRefresh =
  | { status: "ok"; farm: Farm; lostAdmin: boolean }
  | { status: "pending"; error: string };

/**
 * Relee la finca para conocer el rol real de la cuenta tras un PATCH exitoso.
 * Un fallo aquí no significa que el cambio de rol fallara.
 */
export async function refreshAccess(
  getFarm: (farmId: number) => Promise<Farm>,
  farm: Pick<Farm, "id" | "role">,
): Promise<AccessRefresh> {
  try {
    const fresh = await getFarm(farm.id);
    return {
      status: "ok",
      farm: fresh,
      lostAdmin: farm.role === "administrador" && fresh.role !== "administrador",
    };
  } catch (cause) {
    return {
      status: "pending",
      error: cause instanceof Error && cause.message ? cause.message : "No se pudo actualizar",
    };
  }
}

/** Notificación a mostrar según el resultado de la relectura. */
export function accessNotice(
  member: Pick<FarmMember, "name" | "role">,
  refresh: AccessRefresh,
): { text: string; tone: "ok" | "warn" } {
  const who = member.name || "El integrante";
  if (refresh.status === "pending") {
    return {
      tone: "warn",
      text:
        `Rol actualizado: ${who} ahora es ${roleLabel(member.role)}. No se pudo ` +
        "confirmar tu acceso a la finca; las opciones de administración quedan ocultas " +
        "hasta actualizarlo.",
    };
  }
  if (refresh.lostAdmin) {
    return {
      tone: "warn",
      text:
        `Tu rol en esta finca ahora es ${roleLabel(refresh.farm.role)}. ` +
        "Ya no tienes permisos administrativos.",
    };
  }
  return { tone: "ok", text: `Rol actualizado: ${who} ahora es ${roleLabel(member.role)}.` };
}

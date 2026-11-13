/**
 * Descripción legible de eventos de auditoría de fincas.
 *
 * Propósito: convertir un evento en un texto comprensible sin exponer JSON crudo.
 * Contexto: cada caso usa solo las claves que el backend guarda en
 * before_data / after_data para ese EventType (apps/farms/services.py,
 * apps/farms/invitation_services.py y apps/permissions/services.py). Si faltan
 * datos, se usa un texto genérico; nunca se inventan valores.
 * @author Cristian Deysdayr Jimenez
 */

import type { AuditEvent, FarmMembershipStatus, FarmRole } from "../types/index.ts";
import { membershipStatusLabel } from "./membershipStatusLabel.ts";
import { roleLabel } from "./roleLabel.ts";

const ROLES: readonly string[] = ["administrador", "operador", "consulta"];
const STATUSES: readonly string[] = ["active", "revoked", "left"];

/** Orígenes de asignación de permisos (AssignmentSource del backend). */
const SOURCE_LABELS: Record<string, string> = {
  initialization: "inicialización de finca",
  admin: "asignación administrativa",
  invitation: "invitación aceptada",
  migration: "migración de datos",
};

/** Causas que registra la limpieza automática de permisos de una membresía. */
const REASON_LABELS: Record<string, string> = {
  member_left: "Abandono de la finca",
  member_revoked: "Revocación de la membresía",
  member_reactivated: "Reactivación de la membresía",
};

/** @returns El texto si es una cadena no vacía, o null. */
function text(data: Record<string, unknown> | null, key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

/** @returns La etiqueta del rol si el valor es un rol conocido, o null. */
function role(data: Record<string, unknown> | null, key: string): string | null {
  const value = text(data, key);
  return value && ROLES.includes(value) ? roleLabel(value as FarmRole) : null;
}

/** @returns La etiqueta del estado si el valor es conocido, o null. */
function status(data: Record<string, unknown> | null, key: string): string | null {
  const value = text(data, key);
  return value && STATUSES.includes(value)
    ? membershipStatusLabel(value as FarmMembershipStatus)
    : null;
}

/** @returns "módulo · acción" si ambos existen, o null. */
function permission(data: Record<string, unknown> | null): string | null {
  const module = text(data, "module");
  const action = text(data, "action");
  return module && action ? `${module} · ${action}` : null;
}

/** @param event - Evento de auditoría. @returns Descripción legible y segura. */
export function describeEvent(event: AuditEvent): string {
  const before = event.before_data;
  const after = event.after_data;
  switch (event.event_type) {
    case "farm_created":
      return "Finca creada";
    case "farm_updated": {
      const previous = text(before, "name");
      const next = text(after, "name");
      if (previous && next) return `Nombre: ${previous} → ${next}`;
      return "Finca actualizada";
    }
    case "farm_deactivated":
      return "Finca desactivada";
    case "farm_reactivated":
      return "Finca reactivada";
    case "member_role_changed": {
      const previous = role(before, "role");
      const next = role(after, "role");
      if (previous && next) return `Rol: ${previous} → ${next}`;
      return "Rol de integrante cambiado";
    }
    case "member_revoked": {
      const next = status(after, "status");
      return next ? `Membresía revocada (estado: ${next})` : "Membresía revocada";
    }
    case "member_left":
      return "El integrante abandonó la finca";
    case "admin_transferred": {
      // before.to_role: rol previo del receptor; after.from_role: nuevo rol del
      // administrador que transfirió.
      const receiverBefore = role(before, "to_role");
      const previousAdminAfter = role(after, "from_role");
      if (receiverBefore && previousAdminAfter) {
        return (
          `Administración transferida: el receptor pasó de ${receiverBefore} a ` +
          `Administrador y el administrador anterior pasó a ${previousAdminAfter}`
        );
      }
      return "Administración transferida";
    }
    case "member_joined": {
      const joined = role(after, "role");
      return joined ? `Se incorporó a la finca como ${joined}` : "Integrante incorporado";
    }
    case "member_reactivated": {
      const reactivated = role(after, "role");
      return reactivated
        ? `Membresía reactivada como ${reactivated}`
        : "Integrante reactivado";
    }
    case "permission_revoked": {
      const target = permission(before);
      if (!target) return "Permiso revocado";
      const source = text(before, "source");
      const origin = source && SOURCE_LABELS[source] ? ` (origen: ${SOURCE_LABELS[source]})` : "";
      return `Permiso revocado: ${target}${origin}`;
    }
    case "permission_unrestricted": {
      const target = permission(before);
      return target ? `Restricción retirada: ${target}` : "Restricción retirada";
    }
    default:
      return event.event_type_label || "Evento registrado";
  }
}

/**
 * Texto visible del motivo de un evento.
 * @param reason - Motivo guardado por el backend.
 * @returns La causa traducida si es una causa automática conocida; si no, el
 * texto tal cual lo escribió el administrador.
 */
export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

/** @param count - Total de registros. @param pageSize - Tamaño de página. @returns Total de páginas. */
export function totalPages(count: number, pageSize: number): number {
  if (count <= 0 || pageSize <= 0) return 0;
  return Math.ceil(count / pageSize);
}

/**
 * Reglas de presentación de invitaciones.
 *
 * Propósito: validar el formulario, etiquetar estados, derivar el estado de
 * entrega y el vencimiento, e interpretar el resultado de la creación.
 * Contexto: solo usa los campos de InvitationResponseSerializer. El backend
 * decide permisos y conflictos; aquí no se replican como autoridad.
 *
 * Entrega (apps/farms/invitation_services.py, _finalize_delivery):
 * - Proveedor aceptó: delivery_pending=false y last_sent_at con fecha.
 * - Proveedor rechazó: delivery_pending=false y last_sent_at sin cambios
 *   (null si nunca hubo un envío aceptado); la API responde 502.
 * - Resultado indeterminado: delivery_pending=true.
 * Al aceptar, cancelar o expirar, el backend pone delivery_pending=false sin
 * tocar last_sent_at, así que el estado de entrega solo se deriva mientras la
 * invitación está pendiente.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type {
  FarmInvitation,
  FarmRole,
  InvitationCreateRequest,
  InvitationStatus,
} from "../types/index.ts";
import { ROLE_OPTIONS } from "./roleChange.ts";

/** Vigencia fija de una invitación (INVITATION_TTL_DAYS). */
export const INVITATION_TTL_DAYS = 7;

/** Roles que acepta InvitationCreateSerializer (FarmRole.choices). */
export const INVITATION_ROLES: readonly FarmRole[] = ROLE_OPTIONS;

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

/** @returns Etiqueta del estado igual a la del backend. */
export function invitationStatusLabel(status: InvitationStatus): string {
  return STATUS_LABELS[status] ?? status;
}

// Comprobación básica de forma; la validación definitiva es EmailField.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InvitationFormErrors = { email?: string; role?: string };

/**
 * Valida el formulario antes de enviar.
 * @returns Errores por campo; vacío si se puede enviar.
 */
export function validateInvitationForm(
  email: string,
  role: FarmRole | null,
): InvitationFormErrors {
  const errors: InvitationFormErrors = {};
  const trimmed = email.trim();
  if (!trimmed) errors.email = "Escribe el correo de la persona invitada.";
  else if (trimmed.length > 254) errors.email = "El correo no puede superar 254 caracteres.";
  else if (!EMAIL_SHAPE.test(trimmed)) errors.email = "Escribe un correo válido.";
  if (!role || !INVITATION_ROLES.includes(role)) errors.role = "Elige el rol de la invitación.";
  return errors;
}

/** @returns El cuerpo exacto del POST: solo email (recortado) y role. */
export function invitationRequest(email: string, role: FarmRole): InvitationCreateRequest {
  return { email: email.trim(), role };
}

export type DeliveryState =
  | { kind: "unconfirmed"; label: string }
  | { kind: "failed"; label: string }
  | { kind: "sent"; label: string; sentAt: string }
  | { kind: "none" };

/**
 * Estado de entrega del correo, solo para invitaciones pendientes.
 * "Enviada" significa que el proveedor de correo aceptó el mensaje, no que
 * llegó al buzón: el backend no expone confirmación de entrega.
 */
export function deliveryState(
  invitation: Pick<FarmInvitation, "status" | "delivery_pending" | "last_sent_at">,
  knownFailed = false,
): DeliveryState {
  if (invitation.status !== "pending") return { kind: "none" };
  if (invitation.delivery_pending) {
    return { kind: "unconfirmed", label: "Envío sin confirmar" };
  }
  // F9: tras un 502 de reenvío o cambio de rol, last_sent_at conserva la
  // fecha de un enlace anterior que ya no vale; no se muestra como enviada.
  if (knownFailed || !invitation.last_sent_at) {
    return { kind: "failed", label: "No entregada" };
  }
  return { kind: "sent", label: "Enviada", sentAt: invitation.last_sent_at };
}

export type ExpiryInfo = { expired: boolean; label: string };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Texto relativo del vencimiento a partir de expires_at.
 * Solo es informativo: el estado lo decide el backend (expiración perezosa).
 */
export function expiryInfo(expiresAt: string, now: Date = new Date()): ExpiryInfo {
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return { expired: false, label: "Vencimiento desconocido" };
  const diff = expires - now.getTime();
  if (diff <= 0) return { expired: true, label: "Vencida" };
  if (diff < HOUR) return { expired: false, label: "Vence en menos de una hora" };
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return { expired: false, label: `Vence en ${hours} ${hours === 1 ? "hora" : "horas"}` };
  }
  const days = Math.floor(diff / DAY);
  return { expired: false, label: `Vence en ${days} ${days === 1 ? "día" : "días"}` };
}

export const DELIVERY_FAILED_MESSAGE =
  "La invitación quedó creada, pero el correo no pudo enviarse.";

export type CreateOutcome =
  | { status: "created"; invitation: FarmInvitation }
  | { status: "created_without_email"; invitationId: number | null; message: string }
  | { status: "error"; httpStatus: number | null; message: string };

/**
 * Crea la invitación e interpreta el resultado.
 * Un 502 no es un fallo de creación: la invitación existe y sigue pendiente.
 */
export async function submitInvitation(
  create: (farmId: number, request: InvitationCreateRequest) => Promise<FarmInvitation>,
  farmId: number,
  request: InvitationCreateRequest,
): Promise<CreateOutcome> {
  try {
    return { status: "created", invitation: await create(farmId, request) };
  } catch (cause) {
    return createOutcomeFromError(cause);
  }
}

/** Traduce un error de la creación sin ocultar el mensaje del backend. */
export function createOutcomeFromError(cause: unknown): CreateOutcome {
  if (isApiError(cause, 502)) {
    const raw = cause.extra.invitation_id;
    return {
      status: "created_without_email",
      invitationId: typeof raw === "number" ? raw : null,
      message: DELIVERY_FAILED_MESSAGE,
    };
  }
  const message =
    cause instanceof Error && cause.message ? cause.message : "No se pudo crear la invitación";
  return {
    status: "error",
    httpStatus: isApiError(cause) ? cause.status : null,
    message,
  };
}

/** Aviso tras una creación exitosa, sin afirmar entrega no confirmada. */
export function createdNotice(invitation: FarmInvitation): string {
  const state = deliveryState(invitation);
  if (state.kind === "sent") return `Invitación enviada a ${invitation.email}.`;
  return `Invitación creada para ${invitation.email}. El envío del correo aún no está confirmado.`;
}

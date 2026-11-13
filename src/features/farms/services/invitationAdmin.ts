/**
 * Administración de invitaciones: reenvío, cambio de rol y cancelación (F9).
 *
 * Propósito: decidir cuándo se ofrecen las acciones, sus textos, la
 * interpretación de cada respuesta y cómo se refleja en el listado.
 * Contexto (backend verificado en apps/farms/invitation_services.py y views.py):
 * - POST .../invitations/{iid}/resend/ → 200 invitación. Sin cuerpo.
 * - PATCH .../invitations/{iid}/ {role} → 200 invitación.
 * - DELETE .../invitations/{iid}/ → 204.
 * Las tres exigen administrador activo en finca activa (403/404) y una
 * invitación pendiente (409 "la invitación ya no está pendiente"; antes se
 * expiran las vencidas). Reenvío y cambio de rol rotan el token, renuevan la
 * vigencia (7 días) y envían el correo: 502 {invitation_id} si el proveedor lo
 * rechaza (la operación sí quedó aplicada) y 429 por la cuota de reenvío.
 * La cancelación borra el token. El frontend nunca recibe ni genera tokens.
 * La única capacidad del contrato es can_manage_invitations.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type { Farm, FarmInvitation, FarmRole } from "../types/index.ts";
import { deliveryState } from "./invitations.ts";
import { roleLabel } from "./roleLabel.ts";

/** Operaciones HTTP de administración (inyectables en pruebas). */
export type InvitationAdminApi = {
  resendInvitation: (farmId: number, invitationId: number) => Promise<FarmInvitation>;
  changeInvitationRole: (
    farmId: number,
    invitationId: number,
    role: FarmRole,
  ) => Promise<FarmInvitation>;
  cancelInvitation: (farmId: number, invitationId: number) => Promise<void>;
};

export type InvitationAction = "resend" | "role" | "cancel";

/**
 * Gestionar invitaciones según la capacidad del backend; sin capacidades
 * (backend anterior a F6), administrador en finca activa, como _require_admin.
 */
export function canManageInvitations(
  farm: Pick<Farm, "role" | "is_active" | "capabilities">,
): boolean {
  if (farm.capabilities) return farm.capabilities.can_manage_invitations;
  return farm.role === "administrador" && farm.is_active;
}

/** Solo una invitación pendiente admite reenvío, cambio de rol o cancelación. */
export function canAdministerInvitation(invitation: Pick<FarmInvitation, "status">): boolean {
  return invitation.status === "pending";
}

// ---------------------------------------------------------------------------
// Catálogo de roles
// ---------------------------------------------------------------------------

/** Rol del catálogo de Configuración (GET /api/v1/configuracion/roles-permisos/). */
export type CatalogRole = { id: string; nombre: string };

export type RoleOption = { id: FarmRole; nombre: string };

/** Valores que acepta InvitationRoleSerializer (FarmRole.choices). */
const CONTRACT_ROLES: ReadonlySet<string> = new Set(["administrador", "operador", "consulta"]);

/**
 * Opciones de rol a partir del catálogo real, en su orden. Solo se conservan
 * los ids que acepta el contrato de la invitación; el resto se descarta.
 * @throws Error si el catálogo no trae ningún rol utilizable.
 */
export function roleOptionsFromCatalog(roles: readonly CatalogRole[]): RoleOption[] {
  const options = roles
    .filter((role) => CONTRACT_ROLES.has(role.id))
    .map((role) => ({ id: role.id as FarmRole, nombre: role.nombre }));
  if (options.length === 0) throw new Error("El catálogo de roles no tiene roles disponibles.");
  return options;
}

/** Consulta el catálogo y devuelve las opciones de rol. */
export async function loadRoleOptions(
  fetchCatalog: () => Promise<{ roles: readonly CatalogRole[] }>,
): Promise<RoleOption[]> {
  const catalog = await fetchCatalog();
  return roleOptionsFromCatalog(catalog.roles);
}

/** Nombre del rol según el catálogo cargado; si falta, la etiqueta local. */
export function roleName(options: readonly RoleOption[] | null, role: FarmRole): string {
  return options?.find((option) => option.id === role)?.nombre ?? roleLabel(role);
}

// ---------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------

export type ActionCopy = {
  title: string;
  body: string[];
  confirm: string;
  pending: string;
  tone: "default" | "warning";
};

/** Confirmación del reenvío. */
export function resendCopy(invitation: Pick<FarmInvitation, "email">): ActionCopy {
  return {
    title: `¿Reenviar la invitación a ${invitation.email}?`,
    body: [
      "Se enviará un enlace nuevo y la vigencia se renovará por 7 días.",
      "El enlace anterior dejará de funcionar en cuanto se genere el nuevo.",
    ],
    confirm: "Reenviar invitación",
    pending: "Reenviando...",
    tone: "default",
  };
}

/** Confirmación del cambio de rol de la invitación (no de una membresía). */
export function invitationRoleCopy(
  invitation: Pick<FarmInvitation, "email" | "role">,
  next: FarmRole,
  options: readonly RoleOption[] | null,
): ActionCopy {
  return {
    title: `¿Cambiar el rol de la invitación a ${roleName(options, next)}?`,
    body: [
      `La invitación de ${invitation.email} pasará de ${roleName(options, invitation.role)} a ${roleName(options, next)}.`,
      "Solo cambia esta invitación pendiente: no modifica el rol de ningún integrante.",
      "Se enviará un enlace nuevo y el anterior dejará de funcionar.",
    ],
    confirm: "Cambiar rol",
    pending: "Cambiando rol...",
    tone: "default",
  };
}

/** Confirmación de la cancelación. */
export function cancelCopy(invitation: Pick<FarmInvitation, "email">): ActionCopy {
  return {
    title: `¿Cancelar la invitación a ${invitation.email}?`,
    body: [
      "El enlace de la invitación dejará de ser válido y no podrá aceptarse.",
      "Para volver a invitar a esta persona tendrás que crear una invitación nueva.",
    ],
    confirm: "Cancelar invitación",
    pending: "Cancelando...",
    tone: "warning",
  };
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

export type InvitationFailure = {
  message: string;
  /** Código HTTP, o null si no hubo respuesta (red). */
  httpStatus: number | null;
  /** El listado puede estar desactualizado: se vuelve a pedir. */
  reload: boolean;
  /** El backend negó el permiso: hay que releer el acceso a la finca. */
  staleAccess: boolean;
};

const NETWORK: Record<InvitationAction, string> = {
  resend: "No se pudo conectar con el servidor. No se sabe si el reenvío se aplicó: se actualiza el listado.",
  role: "No se pudo conectar con el servidor. No se sabe si el rol cambió: se actualiza el listado.",
  cancel:
    "No se pudo conectar con el servidor. No se sabe si la invitación se canceló: se actualiza el listado.",
};

/** Traduce un error sin ocultar el texto del backend. */
export function invitationFailure(cause: unknown, action: InvitationAction): InvitationFailure {
  if (!isApiError(cause)) {
    return { message: NETWORK[action], httpStatus: null, reload: true, staleAccess: false };
  }
  const base = cause.message || "No se pudo completar la operación";
  const result = (message: string, reload = false, staleAccess = false): InvitationFailure => ({
    message,
    httpStatus: cause.status,
    reload,
    staleAccess,
  });
  switch (cause.status) {
    case 401:
      return result("Tu sesión no es válida o venció. Inicia sesión de nuevo.");
    case 403:
      return result(`${base}. Tu acceso pudo cambiar: se vuelve a consultar la finca.`, false, true);
    case 404:
      return result(`${base}. Se actualiza el listado.`, true);
    case 409:
      return result(
        `${base}: pudo ser aceptada, cancelada o haber vencido. Se actualiza el listado.`,
        true,
      );
    case 429:
      return result(`${base}. Espera un rato antes de volver a intentarlo.`);
    default:
      return result(base);
  }
}

/** Resultado de reenviar o cambiar el rol (ambos envían correo). */
export type SendOutcome =
  | { status: "ok"; invitation: FarmInvitation }
  | { status: "delivery_failed"; invitationId: number | null; message: string }
  | ({ status: "error" } & InvitationFailure);

export type CancelOutcome = { status: "ok" } | ({ status: "error" } & InvitationFailure);

/** 502: la operación quedó aplicada y la invitación sigue pendiente, sin correo. */
function deliveryFailed(cause: unknown, action: "resend" | "role"): SendOutcome | null {
  if (!isApiError(cause, 502)) return null;
  const raw = cause.extra.invitation_id;
  return {
    status: "delivery_failed",
    invitationId: typeof raw === "number" ? raw : null,
    message:
      action === "resend"
        ? "El enlace se renovó, pero el correo no pudo enviarse. La invitación sigue pendiente y puedes volver a reenviarla."
        : "El rol cambió, pero el correo con el nuevo enlace no pudo enviarse. La invitación sigue pendiente y puedes reenviarla.",
  };
}

/** Ejecuta el reenvío. */
export async function submitResend(
  api: Pick<InvitationAdminApi, "resendInvitation">,
  farmId: number,
  invitationId: number,
): Promise<SendOutcome> {
  try {
    return { status: "ok", invitation: await api.resendInvitation(farmId, invitationId) };
  } catch (cause) {
    return deliveryFailed(cause, "resend") ?? { status: "error", ...invitationFailure(cause, "resend") };
  }
}

/** Ejecuta el cambio de rol con el contrato exacto ({role}). */
export async function submitInvitationRole(
  api: Pick<InvitationAdminApi, "changeInvitationRole">,
  farmId: number,
  invitationId: number,
  role: FarmRole,
): Promise<SendOutcome> {
  try {
    return {
      status: "ok",
      invitation: await api.changeInvitationRole(farmId, invitationId, role),
    };
  } catch (cause) {
    return deliveryFailed(cause, "role") ?? { status: "error", ...invitationFailure(cause, "role") };
  }
}

/** Ejecuta la cancelación; el éxito solo se declara con el 204. */
export async function submitCancel(
  api: Pick<InvitationAdminApi, "cancelInvitation">,
  farmId: number,
  invitationId: number,
): Promise<CancelOutcome> {
  try {
    await api.cancelInvitation(farmId, invitationId);
    return { status: "ok" };
  } catch (cause) {
    return { status: "error", ...invitationFailure(cause, "cancel") };
  }
}

/**
 * Aviso tras reenviar o cambiar el rol. Solo se afirma el envío si el
 * backend lo confirmó (delivery_pending=false con last_sent_at).
 */
export function sentNotice(
  action: "resend" | "role",
  invitation: FarmInvitation,
  options: readonly RoleOption[] | null,
): { text: string; tone: "ok" | "warn" } {
  const first =
    action === "resend"
      ? `Invitación a ${invitation.email} reenviada con un enlace nuevo; el anterior ya no funciona.`
      : `La invitación a ${invitation.email} ahora es para ${roleName(options, invitation.role)}; el enlace anterior ya no funciona.`;
  if (deliveryState(invitation).kind === "sent") {
    return { tone: "ok", text: `${first} El correo fue aceptado por el proveedor.` };
  }
  return { tone: "warn", text: `${first} El envío del correo aún no está confirmado.` };
}

export function cancelledNotice(invitation: Pick<FarmInvitation, "email">): string {
  return `Invitación a ${invitation.email} cancelada. Su enlace ya no es válido.`;
}

// ---------------------------------------------------------------------------
// Estado del listado
// ---------------------------------------------------------------------------

/** Sustituye la invitación con el mismo id por la devuelta por el backend. */
export function replaceInvitation(
  list: FarmInvitation[] | null,
  updated: FarmInvitation,
): FarmInvitation[] | null {
  if (!list) return list;
  return list.map((item) => (item.id === updated.id ? updated : item));
}

/**
 * Tras un 502 de reenvío o cambio de rol, last_sent_at conserva la fecha de
 * un envío anterior cuyo enlace ya no vale; esas filas se marcan como no
 * entregadas aunque el listado parezca "Enviada".
 */
export function withDeliveryFailures(
  failed: ReadonlySet<number>,
  id: number | null,
  add: boolean,
): ReadonlySet<number> {
  if (id === null) return failed;
  const next = new Set(failed);
  if (add) next.add(id);
  else next.delete(id);
  return next;
}

// ---------------------------------------------------------------------------
// Diálogos
// ---------------------------------------------------------------------------

export type InvitationDialog = { action: InvitationAction; invitationId: number; role?: FarmRole };

export type InvitationActionState = {
  dialog: InvitationDialog | null;
  acting: boolean;
  error: string;
};

export type InvitationActionEvent =
  | { type: "open"; dialog: InvitationDialog }
  | { type: "cancel" }
  | { type: "start" }
  | { type: "fail"; failure: InvitationFailure }
  | { type: "done" };

export const INITIAL_INVITATION_ACTION: InvitationActionState = {
  dialog: null,
  acting: false,
  error: "",
};

/** Hay un diálogo abierto y ninguna petición en curso. */
export function canStartInvitationAction(state: InvitationActionState): boolean {
  return state.dialog !== null && !state.acting;
}

/**
 * Transiciones: mientras hay una petición en curso no se puede cancelar,
 * abrir otro diálogo ni iniciar otra petición.
 */
export function invitationActionReducer(
  state: InvitationActionState,
  event: InvitationActionEvent,
): InvitationActionState {
  switch (event.type) {
    case "open":
      if (state.acting) return state;
      return { dialog: event.dialog, acting: false, error: "" };
    case "cancel":
      if (state.acting) return state;
      return { ...state, dialog: null, error: "" };
    case "start":
      if (!canStartInvitationAction(state)) return state;
      return { ...state, acting: true, error: "" };
    case "fail":
      return {
        dialog: event.failure.reload ? null : state.dialog,
        acting: false,
        error: event.failure.message,
      };
    case "done":
      return INITIAL_INVITATION_ACTION;
  }
}

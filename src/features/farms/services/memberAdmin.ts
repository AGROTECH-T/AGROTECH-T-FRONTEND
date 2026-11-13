/**
 * Administración de integrantes: revocación y transferencia (F8).
 *
 * Propósito: decidir cuándo se ofrecen las acciones, sus textos de
 * confirmación, los mensajes de error y cómo se refleja el resultado.
 * Contexto (backend verificado en apps/farms/services.py y views.py):
 * - DELETE /farms/{id}/members/{mid}/ → 204. Cuerpo opcional {reason}.
 *   400 "no puedes revocarte a ti mismo"; 403 si el actor no es administrador
 *   o su cuenta no está activa; 404 si la finca o el integrante no están
 *   activos; 409 si el objetivo es el último administrador efectivo.
 * - POST /farms/{id}/members/{mid}/transfer/ → 200 {previous_admin, new_admin}.
 *   Sin cuerpo. En una transacción: el objetivo pasa a administrador y el
 *   actor a operador. 400 si es uno mismo o ya es administrador; 403 si el
 *   actor no es administrador o la cuenta del objetivo no está activa; 404
 *   si la finca o el integrante no están activos.
 * La única capacidad del contrato para estas acciones es can_manage_members
 * (no existen can_revoke_member ni can_transfer_admin). El frontend no conoce
 * el id de la membresía propia: nunca compara nombres y deja que el backend
 * rechace la auto-revocación.
 * @author Cristian Deysdayr Jimenez
 */

import { isApiError } from "../../../services/api/client.ts";
import type {
  Farm,
  FarmMember,
  FarmMembersResponse,
  TransferAdminResponse,
} from "../types/index.ts";
import type { AccessRefresh } from "./roleChange.ts";
import { replaceMember } from "./memberSelection.ts";
import { roleLabel } from "./roleLabel.ts";

/** Operaciones HTTP de administración de integrantes (inyectables en pruebas). */
export type MemberAdminApi = {
  revokeMember: (farmId: number, membershipId: number) => Promise<void>;
  transferAdmin: (farmId: number, membershipId: number) => Promise<TransferAdminResponse>;
};

export type MemberAction = "revoke" | "transfer";

/**
 * Gestionar integrantes según la capacidad del backend; sin capacidades
 * (backend anterior a F6), administrador en finca activa, que es la misma
 * regla que aplica _admin_actor_for_membership_op.
 */
export function canManageMembers(
  farm: Pick<Farm, "role" | "is_active" | "capabilities">,
): boolean {
  if (farm.capabilities) return farm.capabilities.can_manage_members;
  return farm.role === "administrador" && farm.is_active;
}

/** Solo una membresía activa se puede revocar (404 si no). */
export function canRevoke(member: Pick<FarmMember, "status">): boolean {
  return member.status === "active";
}

/**
 * Destinatario válido de la transferencia: membresía activa que aún no es
 * administradora. Como solo un administrador puede transferir, esta regla
 * excluye también a la cuenta actual. Que la cuenta del destinatario esté
 * activa no se expone: lo decide el backend (403).
 */
export function isTransferEligible(member: Pick<FarmMember, "status" | "role">): boolean {
  return member.status === "active" && member.role !== "administrador";
}

/** Integrantes de la página que pueden recibir la administración. */
export function transferCandidates(data: FarmMembersResponse | null): FarmMember[] {
  return data ? data.results.filter(isTransferEligible) : [];
}

export type ActionCopy = {
  title: string;
  body: string[];
  confirm: string;
  pending: string;
};

/** Textos de la confirmación de revocación. */
export function revokeCopy(member: Pick<FarmMember, "name" | "role">): ActionCopy {
  const who = member.name || "este integrante";
  const body = [
    `${who} perderá de inmediato el acceso a esta finca y a su inventario.`,
    "Su membresía quedará como Revocada y su historial se conserva. Para volver necesitará una nueva invitación.",
  ];
  if (member.role === "administrador") {
    body.push(
      "La finca debe conservar al menos un administrador activo; si no hay otro, la revocación será rechazada.",
      "Si esta membresía es la tuya, no se puede revocar: para salir usa «Abandonar finca» en Resumen.",
    );
  }
  return {
    title: `¿Revocar el acceso de ${who}?`,
    body,
    confirm: "Revocar acceso",
    pending: "Revocando acceso...",
  };
}

/** Textos de la confirmación de transferencia. */
export function transferCopy(member: Pick<FarmMember, "name" | "role">): ActionCopy {
  const who = member.name || "este integrante";
  return {
    title: `¿Transferir la administración a ${who}?`,
    body: [
      `${who} pasará de ${roleLabel(member.role)} a Administrador.`,
      "Tú pasarás a Operador y perderás de inmediato las opciones de administración de esta finca.",
      "Solo cambian estos dos roles: los demás integrantes conservan el suyo.",
    ],
    confirm: "Transferir administración",
    pending: "Transfiriendo...",
  };
}

const NETWORK_MESSAGE = "No se pudo conectar con el servidor.";
const SESSION_MESSAGE = "Tu sesión no es válida o venció. Inicia sesión de nuevo.";

/** Resultado de una acción fallida, listo para la interfaz. */
export type ActionFailure = {
  message: string;
  /** Código HTTP, o null si no hubo respuesta (red). */
  httpStatus: number | null;
  /** El estado mostrado puede estar desactualizado: se relee el integrante. */
  reload: boolean;
  /** El backend negó el permiso: se relee la finca para conocer el acceso real. */
  staleAccess: boolean;
};

/**
 * Traduce el error sin ocultar el texto del backend; añade contexto solo en
 * los casos verificados en revoke_member y transfer_admin.
 */
export function memberActionFailure(cause: unknown, action: MemberAction): ActionFailure {
  if (!isApiError(cause)) {
    return {
      message:
        action === "revoke"
          ? `${NETWORK_MESSAGE} No se sabe si la revocación se aplicó: se vuelve a consultar el integrante.`
          : `${NETWORK_MESSAGE} No se sabe si la transferencia se aplicó: se vuelve a consultar el integrante.`,
      httpStatus: null,
      reload: true,
      staleAccess: false,
    };
  }
  const base = cause.message || "No se pudo completar la operación";
  const result = (message: string, reload = false, staleAccess = false): ActionFailure => ({
    message,
    httpStatus: cause.status,
    reload,
    staleAccess,
  });
  switch (cause.status) {
    case 401:
      return result(SESSION_MESSAGE);
    case 400:
      if (cause.serverMessage === "no puedes revocarte a ti mismo") {
        return result(`${base}. Para salir de la finca usa «Abandonar finca» en Resumen.`);
      }
      return result(base);
    case 403:
      if (action === "transfer" && cause.serverMessage === "la cuenta no está activa") {
        return result(`${base}. Una cuenta inactiva no puede recibir la administración.`);
      }
      return result(`${base}. Tu acceso pudo cambiar: se vuelve a consultar la finca.`, false, true);
    case 404:
      return result(`${base}. Es posible que ya no esté activo; se vuelve a consultar.`, true);
    case 409:
      return action === "revoke"
        ? result(
            `${base}. Promueve antes a otra persona a Administrador o transfiere la administración.`,
          )
        : result(base);
    default:
      return result(base);
  }
}

/** Diálogo abierto en el detalle: uno solo a la vez. */
export type MemberDialog = "role" | MemberAction;

/** Estado de los diálogos y de la acción en curso del detalle. */
export type ActionState = {
  dialog: MemberDialog | null;
  /** Revocación o transferencia pendiente de respuesta. */
  acting: boolean;
  error: string;
  notice: string;
};

export type ActionEvent =
  | { type: "open"; dialog: MemberDialog }
  | { type: "cancel" }
  | { type: "start" }
  | { type: "fail"; failure: ActionFailure }
  | { type: "done"; notice?: string };

export const INITIAL_ACTION_STATE: ActionState = {
  dialog: null,
  acting: false,
  error: "",
  notice: "",
};

/** Puede empezar una revocación o transferencia: diálogo abierto y nada en curso. */
export function canStartAction(state: ActionState): boolean {
  return !state.acting && (state.dialog === "revoke" || state.dialog === "transfer");
}

/**
 * Transiciones de los diálogos. Mientras hay una acción en curso no se
 * puede cancelar, abrir otro diálogo ni empezar otra acción.
 */
export function actionReducer(state: ActionState, event: ActionEvent): ActionState {
  switch (event.type) {
    case "open":
      if (state.acting) return state;
      return { dialog: event.dialog, acting: false, error: "", notice: "" };
    case "cancel":
      if (state.acting) return state;
      return { ...state, dialog: null, error: "" };
    case "start":
      if (!canStartAction(state)) return state;
      return { ...state, acting: true, error: "", notice: "" };
    case "fail":
      return {
        ...state,
        acting: false,
        error: event.failure.message,
        // Si el dato pudo cambiar se cierra el diálogo y se relee el integrante.
        dialog: event.failure.reload ? null : state.dialog,
      };
    case "done":
      return { dialog: null, acting: false, error: "", notice: event.notice ?? "" };
  }
}

export type RevokeOutcome ={ status: "ok" } | ({ status: "error" } & ActionFailure);

export type TransferOutcome =
  | { status: "ok"; result: TransferAdminResponse }
  | ({ status: "error" } & ActionFailure);

/** Ejecuta la revocación; el éxito solo se declara con la respuesta 204. */
export async function submitRevoke(
  api: Pick<MemberAdminApi, "revokeMember">,
  farmId: number,
  membershipId: number,
): Promise<RevokeOutcome> {
  try {
    await api.revokeMember(farmId, membershipId);
    return { status: "ok" };
  } catch (cause) {
    return { status: "error", ...memberActionFailure(cause, "revoke") };
  }
}

/** Ejecuta la transferencia y devuelve las dos membresías que respondió el backend. */
export async function submitTransfer(
  api: Pick<MemberAdminApi, "transferAdmin">,
  farmId: number,
  membershipId: number,
): Promise<TransferOutcome> {
  try {
    return { status: "ok", result: await api.transferAdmin(farmId, membershipId) };
  } catch (cause) {
    return { status: "error", ...memberActionFailure(cause, "transfer") };
  }
}

/** Refleja en la página cargada las dos membresías devueltas por la transferencia. */
export function applyTransfer(
  data: FarmMembersResponse | null,
  result: TransferAdminResponse,
): FarmMembersResponse | null {
  return replaceMember(replaceMember(data, result.previous_admin), result.new_admin);
}

export type MembersQuery = { page: number; status: string; query: string };

/**
 * Vuelve a pedir la página actual con los mismos filtros. Si quedó vacía
 * (p. ej. se revocó el único de la última página), pide la anterior.
 */
export async function reloadMembersPage(
  listMembers: (
    farmId: number,
    status: string,
    search: string,
    page: number,
    pageSize: number,
  ) => Promise<FarmMembersResponse>,
  farmId: number,
  current: MembersQuery,
  pageSize: number,
): Promise<{ data: FarmMembersResponse; page: number }> {
  const data = await listMembers(farmId, current.status, current.query, current.page, pageSize);
  if (data.results.length === 0 && current.page > 1) {
    const page = current.page - 1;
    return {
      data: await listMembers(farmId, current.status, current.query, page, pageSize),
      page,
    };
  }
  return { data, page: current.page };
}

/** Texto de éxito de cada acción. */
export function revokedText(member: Pick<FarmMember, "name">): string {
  return `${member.name || "El integrante"} ya no tiene acceso a la finca.`;
}

export function transferredText(result: TransferAdminResponse): string {
  return `La administración pasó a ${result.new_admin.name || "el integrante"}.`;
}

/**
 * Notificación tras releer la finca (GET /farms/{id}/) después de una acción
 * exitosa. Un fallo de esa lectura no deshace la acción.
 */
export function memberChangeNotice(
  successText: string,
  refresh: AccessRefresh,
): { text: string; tone: "ok" | "warn" } {
  if (refresh.status === "pending") {
    return {
      tone: "warn",
      text:
        `${successText} No se pudo confirmar tu acceso a la finca; las opciones de ` +
        "administración quedan ocultas hasta actualizarlo.",
    };
  }
  if (refresh.lostAdmin) {
    return {
      tone: "warn",
      text:
        `${successText} Tu rol en esta finca ahora es ${roleLabel(refresh.farm.role)}. ` +
        "Ya no tienes permisos administrativos.",
    };
  }
  return { tone: "ok", text: successText };
}

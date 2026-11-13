/**
 * Contratos del dominio de fincas.
 *
 * Propósito: tipar lo que devuelve la API de Farms v1.
 * Contexto: listado, creación y detalle con el rol de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

export type FarmRole = "administrador" | "operador" | "consulta";

/**
 * Capacidades de la cuenta en la finca, calculadas por el backend
 * (FarmCapabilitiesSerializer). Son informativas: la autorización real la
 * aplica cada endpoint.
 */
export type FarmCapabilities = {
  can_edit_farm: boolean;
  can_deactivate_farm: boolean;
  can_reactivate_farm: boolean;
  can_view_history: boolean;
  can_manage_members: boolean;
  can_manage_invitations: boolean;
  can_read_inventory: boolean;
  can_write_inventory: boolean;
};

export type Farm = {
  id: number;
  name: string;
  role: FarmRole;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  deactivated_at: string | null;
  /** Ausente solo con un backend anterior a F6: se usa el rol como respaldo. */
  capabilities?: FarmCapabilities;
};

export type AuditEvent = {
  event_type: string;
  event_type_label: string;
  created_at: string;
  actor_display: string;
  entity_type: string;
  entity_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  reason: string;
};

export type HistoryPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEvent[];
};

export type FarmMembershipStatus = "active" | "revoked" | "left";

export type FarmMember = {
  id: number;
  name: string;
  role: FarmRole;
  status: FarmMembershipStatus;
  created_at: string;
  updated_at: string;
};

export type FarmMembersResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: FarmMember[];
};

export type ChangeMemberRoleRequest = {
  role: FarmRole;
};

export type RevokeMemberRequest = {
  reason?: string;
};

export type TransferAdminResponse = {
  previous_admin: FarmMember;
  new_admin: FarmMember;
};

/** Estados de InvitationStatus en el backend. */
export type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

/** Campos de InvitationResponseSerializer (el token nunca se expone). */
export type FarmInvitation = {
  id: number;
  email: string;
  role: FarmRole;
  status: InvitationStatus;
  expires_at: string;
  last_sent_at: string | null;
  delivery_pending: boolean;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Cuerpo de InvitationCreateSerializer: solo estos dos campos. */
export type InvitationCreateRequest = {
  email: string;
  role: FarmRole;
};

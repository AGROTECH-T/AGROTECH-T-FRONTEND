/**
 * Invitaciones de una finca.
 *
 * Propósito: crear invitaciones (correo y rol) y listar las existentes con su
 * estado, vencimiento y entrega del correo.
 * Contexto: pestaña Invitaciones (administrador en finca activa). El backend
 * autoriza y decide conflictos; un 502 indica que la invitación sí se creó
 * pero el correo no salió. Desde F9, con can_manage_invitations confirmado,
 * cada invitación pendiente se puede reenviar, cambiar de rol (roles del
 * catálogo de Configuración) o cancelar. El listado solo cambia con la
 * respuesta del backend.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import { fetchRolesPermisos } from "../../configuracion/services/rolesPermisos.ts";
import { formatDate } from "../services/date.ts";
import {
  createdNotice,
  deliveryState,
  expiryInfo,
  INVITATION_ROLES,
  INVITATION_TTL_DAYS,
  invitationRequest,
  invitationStatusLabel,
  submitInvitation,
  validateInvitationForm,
  type InvitationFormErrors,
} from "../services/invitations.ts";
import {
  cancelCopy,
  cancelledNotice,
  canAdministerInvitation,
  canStartInvitationAction,
  INITIAL_INVITATION_ACTION,
  invitationActionReducer,
  invitationRoleCopy,
  loadRoleOptions,
  replaceInvitation,
  resendCopy,
  roleName,
  sentNotice,
  submitCancel,
  submitInvitationRole,
  submitResend,
  withDeliveryFailures,
  type ActionCopy,
  type CatalogRole,
  type InvitationAdminApi,
  type InvitationDialog,
  type InvitationFailure,
  type RoleOption,
  type SendOutcome,
} from "../services/invitationAdmin.ts";
import {
  cancelInvitation,
  changeInvitationRole,
  createInvitation,
  listInvitations,
  resendInvitation,
} from "../services/invitationsApi.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type { FarmInvitation, FarmRole, InvitationCreateRequest } from "../types/index.ts";

export type InvitationsApi = {
  listInvitations: (farmId: number) => Promise<FarmInvitation[]>;
  createInvitation: (
    farmId: number,
    request: InvitationCreateRequest,
  ) => Promise<FarmInvitation>;
};

const DEFAULT_API: InvitationsApi = { listInvitations, createInvitation };
const DEFAULT_ADMIN_API: InvitationAdminApi = {
  resendInvitation,
  changeInvitationRole,
  cancelInvitation,
};

type Props = {
  farmId: number;
  api?: InvitationsApi;
  onNotice?: (text: string, tone: "ok" | "warn") => void;
  /** Listado ya cargado (pruebas de renderizado). */
  initialInvitations?: FarmInvitation[];
  /** Valores iniciales del formulario (pruebas de renderizado). */
  initialEmail?: string;
  initialRole?: FarmRole | null;
  initialConfirmOpen?: boolean;
  initialSubmitting?: boolean;
  /** Aviso de entrega fallida al montar (pruebas de renderizado). */
  initialDeliveryWarning?: { invitationId: number | null; message: string } | null;
  /** Fecha de referencia para el vencimiento (pruebas). */
  now?: Date;
  /**
   * La finca concede can_manage_invitations (F9). Sin confirmarlo no se
   * ofrecen reenvío, cambio de rol ni cancelación.
   */
  canManage?: boolean;
  /** Reenvío, cambio de rol y cancelación (inyectables en pruebas). */
  adminApi?: InvitationAdminApi;
  /** Catálogo real de roles (inyectable en pruebas). */
  fetchCatalog?: () => Promise<{ roles: readonly CatalogRole[] }>;
  /** El backend negó un permiso (403): hay que releer el acceso a la finca. */
  onAccessStale?: () => void;
  /** Estado inicial (pruebas de renderizado). */
  initialRoleOptions?: RoleOption[];
  initialAction?: InvitationDialog;
  initialActing?: boolean;
  initialActionError?: string;
  initialEditingRoleId?: number;
  initialFailedDelivery?: number[];
};

/**
 * Formulario y listado de invitaciones.
 * @param props - Finca y dependencias.
 * @returns Sección de invitaciones.
 */
export function FarmInvitations({
  farmId,
  api = DEFAULT_API,
  onNotice,
  initialInvitations,
  initialEmail = "",
  initialRole = null,
  initialConfirmOpen = false,
  initialSubmitting = false,
  initialDeliveryWarning = null,
  now,
  canManage = false,
  adminApi = DEFAULT_ADMIN_API,
  fetchCatalog = fetchRolesPermisos,
  onAccessStale,
  initialRoleOptions,
  initialAction,
  initialActing = false,
  initialActionError = "",
  initialEditingRoleId,
  initialFailedDelivery = [],
}: Readonly<Props>) {
  const [invitations, setInvitations] = useState<FarmInvitation[] | null>(
    initialInvitations ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<FarmRole | null>(initialRole);
  const [fieldErrors, setFieldErrors] = useState<InvitationFormErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(initialConfirmOpen);
  const [submitting, setSubmitting] = useState(initialSubmitting);
  const [submitError, setSubmitError] = useState("");
  const [deliveryWarning, setDeliveryWarning] = useState(initialDeliveryWarning);
  const [highlightId, setHighlightId] = useState<number | null>(
    initialDeliveryWarning?.invitationId ?? null,
  );
  const requestSeq = useRef(0);
  // F9: un solo diálogo de administración a la vez.
  const [actionState, send] = useReducer(invitationActionReducer, undefined, () => ({
    ...INITIAL_INVITATION_ACTION,
    dialog: initialAction ?? null,
    acting: initialActing && initialAction !== undefined,
    error: initialActionError,
  }));
  // Candado síncrono ante dos pulsaciones seguidas.
  const actingRef = useRef(false);
  const [failedDelivery, setFailedDelivery] = useState<ReadonlySet<number>>(
    () => new Set(initialFailedDelivery),
  );
  const [editing, setEditing] = useState<{ id: number; role: FarmRole | null } | null>(
    initialEditingRoleId === undefined ? null : { id: initialEditingRoleId, role: null },
  );
  const [roleOptions, setRoleOptions] = useState<RoleOption[] | null>(
    initialRoleOptions ?? null,
  );
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const busy = submitting || actionState.acting;

  async function load() {
    const requestId = ++requestSeq.current;
    setLoading(true);
    setListError("");
    try {
      const result = await api.listInvitations(farmId);
      if (requestId !== requestSeq.current) return;
      setInvitations(result);
    } catch (cause) {
      if (requestId !== requestSeq.current) return;
      setListError(
        cause instanceof Error && cause.message
          ? cause.message
          : "No se pudieron cargar las invitaciones",
      );
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (initialInvitations === undefined) void load();
    return () => {
      requestSeq.current += 1;
    };
    // Solo al montar o al cambiar de finca.
  }, [farmId]);

  function resetForm() {
    setEmail("");
    setRole(null);
    setFieldErrors({});
  }

  function openConfirm(event: FormEvent) {
    event.preventDefault();
    const errors = validateInvitationForm(email, role);
    setFieldErrors(errors);
    if (errors.email || errors.role) return;
    setSubmitError("");
    setConfirmOpen(true);
  }

  async function confirmCreate() {
    if (!role) return;
    setSubmitting(true);
    setSubmitError("");
    const outcome = await submitInvitation(
      api.createInvitation,
      farmId,
      invitationRequest(email, role),
    );
    setSubmitting(false);

    if (outcome.status === "error") {
      setSubmitError(outcome.message);
      return;
    }

    setConfirmOpen(false);
    resetForm();

    if (outcome.status === "created") {
      setDeliveryWarning(null);
      setHighlightId(outcome.invitation.id);
      setInvitations((current) => [
        outcome.invitation,
        ...(current ?? []).filter((item) => item.id !== outcome.invitation.id),
      ]);
      onNotice?.(createdNotice(outcome.invitation), "ok");
      return;
    }

    // 502: la invitación existe; se recarga el listado para ver su estado real.
    setDeliveryWarning({ invitationId: outcome.invitationId, message: outcome.message });
    setHighlightId(outcome.invitationId);
    onNotice?.(outcome.message, "warn");
    await load();
  }

  async function loadRoles() {
    setRolesLoading(true);
    setRolesError("");
    try {
      setRoleOptions(await loadRoleOptions(fetchCatalog));
    } catch (cause) {
      setRolesError(
        cause instanceof Error && cause.message
          ? `No se pudo cargar el catálogo de roles: ${cause.message}`
          : "No se pudo cargar el catálogo de roles.",
      );
    } finally {
      setRolesLoading(false);
    }
  }

  function startRoleEdit(invitation: FarmInvitation) {
    setEditing({ id: invitation.id, role: null });
    if (roleOptions === null && !rolesLoading) void loadRoles();
  }

  /** Fallo común: muestra el motivo y, si el dato pudo cambiar, relee. */
  async function actionFailed(failure: InvitationFailure) {
    actingRef.current = false;
    send({ type: "fail", failure });
    if (failure.staleAccess) onAccessStale?.();
    if (failure.reload) {
      setEditing(null);
      await load();
    }
  }

  /** Aplica el resultado de un reenvío o cambio de rol. */
  async function applySend(action: "resend" | "role", id: number, outcome: SendOutcome) {
    if (outcome.status === "error") {
      await actionFailed(outcome);
      return;
    }
    actingRef.current = false;
    send({ type: "done" });
    setEditing(null);
    if (outcome.status === "ok") {
      // Invitación devuelta por el backend: vigencia, rol y entrega reales.
      setFailedDelivery((current) => withDeliveryFailures(current, id, false));
      setInvitations((current) => replaceInvitation(current, outcome.invitation));
      setHighlightId(id);
      const notice = sentNotice(action, outcome.invitation, roleOptions);
      onNotice?.(notice.text, notice.tone);
      return;
    }
    // 502: la operación quedó aplicada, pero el correo no salió.
    const failedId = outcome.invitationId ?? id;
    setFailedDelivery((current) => withDeliveryFailures(current, failedId, true));
    setDeliveryWarning({ invitationId: failedId, message: outcome.message });
    setHighlightId(failedId);
    onNotice?.(outcome.message, "warn");
    await load();
  }

  async function confirmAction() {
    const dialog = actionState.dialog;
    if (!dialog || actingRef.current || !canStartInvitationAction(actionState)) return;
    actingRef.current = true;
    send({ type: "start" });
    const target = invitations?.find((item) => item.id === dialog.invitationId);

    if (dialog.action === "resend") {
      await applySend("resend", dialog.invitationId, await submitResend(adminApi, farmId, dialog.invitationId));
      return;
    }
    if (dialog.action === "role") {
      if (!dialog.role) {
        actingRef.current = false;
        send({ type: "cancel" });
        return;
      }
      await applySend(
        "role",
        dialog.invitationId,
        await submitInvitationRole(adminApi, farmId, dialog.invitationId, dialog.role),
      );
      return;
    }
    const outcome = await submitCancel(adminApi, farmId, dialog.invitationId);
    if (outcome.status === "error") {
      await actionFailed(outcome);
      return;
    }
    // 204: el backend confirmó la cancelación; el estado real se relee.
    actingRef.current = false;
    send({ type: "done" });
    setFailedDelivery((current) => withDeliveryFailures(current, dialog.invitationId, false));
    setHighlightId(dialog.invitationId);
    onNotice?.(cancelledNotice(target ?? { email: "la persona invitada" }), "ok");
    await load();
  }

  const dialogTarget = actionState.dialog
    ? (invitations?.find((item) => item.id === actionState.dialog?.invitationId) ?? null)
    : null;
  let dialogCopy: ActionCopy | null = null;
  if (actionState.dialog && dialogTarget) {
    const { action, role: nextRole } = actionState.dialog;
    if (action === "resend") dialogCopy = resendCopy(dialogTarget);
    else if (action === "cancel") dialogCopy = cancelCopy(dialogTarget);
    else if (nextRole) dialogCopy = invitationRoleCopy(dialogTarget, nextRole, roleOptions);
  }

  function renderActions(invitation: FarmInvitation): ReactNode {
    if (!canManage || !canAdministerInvitation(invitation)) return null;
    const isEditing = editing?.id === invitation.id;
    return (
      <div className="farm-invitation__admin">
        {actionState.error && actionState.dialog === null && highlightId === invitation.id ? (
          <p className="farm-form__error" role="alert">
            {actionState.error}
          </p>
        ) : null}
        {isEditing ? (
          <div className="farm-invitation__role-editor">
            <span className="farm-invitation__label" id={`invitation-role-${invitation.id}`}>
              Nuevo rol de la invitación
            </span>
            {rolesLoading ? (
              <p className="farm-empty__hint" role="status">
                Cargando roles...
              </p>
            ) : null}
            {!rolesLoading && rolesError ? (
              <div role="alert">
                <p className="farm-form__error">{rolesError}</p>
                <button type="button" className="btn-secondary" onClick={() => void loadRoles()}>
                  Reintentar
                </button>
              </div>
            ) : null}
            {!rolesLoading && !rolesError && roleOptions ? (
              <div
                className="farm-members__filters"
                role="radiogroup"
                aria-labelledby={`invitation-role-${invitation.id}`}
              >
                {roleOptions.map((option) => {
                  const checked = option.id === editing.role;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      data-role={option.id}
                      className={
                        checked ? "farm-members__filter is-active" : "farm-members__filter"
                      }
                      disabled={busy || option.id === invitation.role}
                      onClick={() => setEditing({ id: invitation.id, role: option.id })}
                    >
                      {option.nombre}
                      {option.id === invitation.role ? " (actual)" : ""}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="farm-form__actions">
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !editing.role || editing.role === invitation.role}
                onClick={() => {
                  if (!editing.role) return;
                  send({
                    type: "open",
                    dialog: { action: "role", invitationId: invitation.id, role: editing.role },
                  });
                }}
              >
                Guardar rol
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Descartar
              </button>
            </div>
          </div>
        ) : (
          <div className="farm-invitation__actions">
            <button
              type="button"
              className="btn-secondary"
              data-action="resend"
              disabled={busy}
              onClick={() => {
                setHighlightId(invitation.id);
                send({ type: "open", dialog: { action: "resend", invitationId: invitation.id } });
              }}
            >
              Reenviar
            </button>
            <button
              type="button"
              className="btn-secondary"
              data-action="role"
              disabled={busy}
              onClick={() => {
                setHighlightId(invitation.id);
                startRoleEdit(invitation);
              }}
            >
              Cambiar rol
            </button>
            <button
              type="button"
              className="btn-danger"
              data-action="cancel"
              disabled={busy}
              onClick={() => {
                setHighlightId(invitation.id);
                send({ type: "open", dialog: { action: "cancel", invitationId: invitation.id } });
              }}
            >
              Cancelar invitación
            </button>
          </div>
        )}
      </div>
    );
  }

  const reference = now ?? new Date();
  const confirmRole = role ? roleLabel(role) : "";

  return (
    <section className="farm-invitations" aria-label="Invitaciones de la finca">
      <form className="farm-form farm-invitations__form" onSubmit={openConfirm} noValidate>
        <h3 className="farm-form__title">Nueva invitación</h3>
        <p className="farm-empty__hint">
          La persona recibirá un enlace de un solo uso válido por {INVITATION_TTL_DAYS} días.
          Para aceptarlo debe registrarse y verificar este mismo correo.
        </p>
        <label className="farm-form__field">
          <span>Correo</span>
          <input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="off"
            maxLength={254}
            placeholder="persona@ejemplo.com"
            value={email}
            disabled={submitting}
            aria-invalid={fieldErrors.email ? true : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
          />
          {fieldErrors.email ? (
            <span className="farm-form__gap">{fieldErrors.email}</span>
          ) : null}
        </label>

        <div className="farm-form__field">
          <span id="farm-invitation-role">Rol</span>
          <div
            className="farm-members__filters"
            role="radiogroup"
            aria-labelledby="farm-invitation-role"
          >
            {INVITATION_ROLES.map((option) => {
              const checked = option === role;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  data-role={option}
                  className={checked ? "farm-members__filter is-active" : "farm-members__filter"}
                  disabled={submitting}
                  onClick={() => {
                    setRole(option);
                    setFieldErrors((current) => ({ ...current, role: undefined }));
                  }}
                >
                  {roleLabel(option)}
                </button>
              );
            })}
          </div>
          {fieldErrors.role ? <span className="farm-form__gap">{fieldErrors.role}</span> : null}
        </div>

        <div className="farm-form__actions">
          <button type="submit" className="btn-primary" disabled={busy}>
            {submitting ? "Enviando..." : "Enviar invitación"}
          </button>
        </div>
      </form>

      {deliveryWarning ? (
        <div className="farm-state farm-invitations__warning" role="alert">
          <p className="farm-empty__title">{deliveryWarning.message}</p>
          <p className="farm-empty__hint">
            La invitación sigue pendiente
            {deliveryWarning.invitationId !== null
              ? ` (identificador ${deliveryWarning.invitationId})`
              : ""}
            . Revisa su estado en el listado.
          </p>
        </div>
      ) : null}

      <h3 className="farm-form__title">Invitaciones</h3>

      {loading ? (
        <p className="farm-state" role="status">
          Cargando invitaciones...
        </p>
      ) : null}

      {!loading && listError ? (
        <div className="farm-state" role="alert">
          <p>{listError}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !listError && invitations && invitations.length === 0 ? (
        <p className="farm-state" role="status">
          Aún no hay invitaciones en esta finca.
        </p>
      ) : null}

      {!loading && !listError && invitations && invitations.length > 0 ? (
        <ul className="farm-invitations__list">
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              now={reference}
              highlighted={invitation.id === highlightId}
              knownFailed={failedDelivery.has(invitation.id)}
              roleName={roleName(roleOptions, invitation.role)}
            >
              {renderActions(invitation)}
            </InvitationRow>
          ))}
        </ul>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={`¿Enviar invitación a ${email.trim()}?`}
        description={
          <>
            <p>
              Se invitará con el rol {confirmRole}. El enlace vence en {INVITATION_TTL_DAYS} días.
            </p>
            <p>Aceptar la invitación no concede permisos operativos automáticamente.</p>
          </>
        }
        confirmLabel="Enviar invitación"
        pendingLabel="Enviando..."
        loading={submitting}
        error={submitError}
        onConfirm={confirmCreate}
        onCancel={() => {
          setConfirmOpen(false);
          setSubmitError("");
        }}
      />

      {canManage ? (
        <ConfirmDialog
          open={dialogCopy !== null}
          tone={dialogCopy?.tone ?? "default"}
          title={dialogCopy?.title ?? ""}
          description={
            dialogCopy ? (
              <>
                {dialogCopy.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </>
            ) : null
          }
          confirmLabel={dialogCopy?.confirm}
          pendingLabel={dialogCopy?.pending}
          cancelLabel="Volver"
          loading={actionState.acting}
          error={actionState.dialog ? actionState.error : ""}
          onConfirm={confirmAction}
          onCancel={() => send({ type: "cancel" })}
        />
      ) : null}
    </section>
  );
}

type RowProps = {
  invitation: FarmInvitation;
  now: Date;
  highlighted: boolean;
  /** Un 502 posterior confirmó que el último envío falló (F9). */
  knownFailed?: boolean;
  /** Nombre del rol (catálogo si está cargado). */
  roleName?: string;
  /** Acciones de administración (F9). */
  children?: ReactNode;
};

/** Fila de una invitación con estado, vencimiento y entrega. */
function InvitationRow({
  invitation,
  now,
  highlighted,
  knownFailed = false,
  roleName: shownRole,
  children,
}: Readonly<RowProps>) {
  const delivery = deliveryState(invitation, knownFailed);
  const pending = invitation.status === "pending";
  const expiry = expiryInfo(invitation.expires_at, now);
  const className = highlighted
    ? "farm-invitation farm-members__item is-highlighted"
    : "farm-invitation farm-members__item";

  return (
    <li className={className} data-invitation-id={invitation.id}>
      <div className="farm-invitation__main">
        <span className="farm-members__name">{invitation.email}</span>
        <span className="farm-members__meta">
          {shownRole ?? roleLabel(invitation.role)}
          <span className={`farm-invitation-status is-${invitation.status}`}>
            {invitationStatusLabel(invitation.status)}
          </span>
        </span>
      </div>

      <dl className="farm-invitation__facts">
        {pending ? (
          <div>
            <dt>Vence</dt>
            <dd>
              {formatDate(invitation.expires_at)} · {expiry.label}
            </dd>
          </div>
        ) : null}
        {invitation.status === "expired" ? (
          <div>
            <dt>Venció</dt>
            <dd>{formatDate(invitation.expires_at)}</dd>
          </div>
        ) : null}
        {invitation.status === "accepted" && invitation.accepted_at ? (
          <div>
            <dt>Aceptada</dt>
            <dd>{formatDate(invitation.accepted_at)}</dd>
          </div>
        ) : null}
        {invitation.status === "cancelled" && invitation.cancelled_at ? (
          <div>
            <dt>Cancelada</dt>
            <dd>{formatDate(invitation.cancelled_at)}</dd>
          </div>
        ) : null}
        {delivery.kind !== "none" ? (
          <div>
            <dt>Correo</dt>
            <dd>
              <span className={`farm-invitation-delivery is-${delivery.kind}`}>
                {delivery.label}
              </span>
              {delivery.kind === "sent" ? ` el ${formatDate(delivery.sentAt)}` : ""}
            </dd>
          </div>
        ) : null}
        {delivery.kind === "none" && invitation.last_sent_at ? (
          <div>
            <dt>Último envío</dt>
            <dd>{formatDate(invitation.last_sent_at)}</dd>
          </div>
        ) : null}
      </dl>
      {children}
    </li>
  );
}

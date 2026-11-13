/**
 * Detalle de un integrante de la finca.
 *
 * Propósito: mostrar nombre, rol, estado y fechas de una membresía, su
 * historial individual paginado, el cambio de rol (PATCH del integrante) y,
 * desde F8, la revocación y la transferencia de la administración. El
 * backend decide si cada operación procede (400/403/404/409).
 * Contexto: se abre desde la pestaña Integrantes (solo administrador). El
 * serializer no expone correo, teléfono ni identificación.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useReducer, useRef, useState } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import {
  changeMemberRole,
  getFarmMember,
  listMemberHistory,
  revokeMember,
  transferAdmin,
} from "../services/farmsApi.ts";
import { formatDate } from "../services/date.ts";
import {
  historyReducer,
  historyView,
  INITIAL_HISTORY,
  type HistoryState,
} from "../services/historyState.ts";
import {
  errorMessage,
  loadMemberDetail,
  loadMemberHistoryPage,
  MEMBER_HISTORY_PAGE_SIZE,
  type MemberDetailApi,
} from "../services/memberDetail.ts";
import {
  actionReducer,
  canRevoke,
  canStartAction,
  INITIAL_ACTION_STATE,
  isTransferEligible,
  revokeCopy,
  submitRevoke,
  submitTransfer,
  transferCopy,
  type ActionFailure,
  type MemberAdminApi,
  type MemberDialog,
} from "../services/memberAdmin.ts";
import { membershipStatusLabel } from "../services/membershipStatusLabel.ts";
import {
  canChangeRole,
  isRoleChange,
  ROLE_OPTIONS,
  roleChangeCopy,
  submitRoleChange,
} from "../services/roleChange.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type { FarmMember, FarmRole, TransferAdminResponse } from "../types/index.ts";
import { HistoryEvents } from "./HistoryEvents.tsx";

const DEFAULT_API: MemberDetailApi = { getFarmMember, listMemberHistory };
const DEFAULT_ADMIN_API: MemberAdminApi = { revokeMember, transferAdmin };

type Props = {
  farmId: number;
  /** Integrante seleccionado en el listado (datos iniciales). */
  member: FarmMember;
  onBack: () => void;
  api?: MemberDetailApi;
  /** Estado inicial del historial (pruebas de renderizado). */
  initialHistory?: HistoryState;
  /** PATCH de rol (inyectable en pruebas). */
  changeRole?: (farmId: number, membershipId: number, role: FarmRole) => Promise<FarmMember>;
  /** Tras un cambio de rol exitoso, con la membresía devuelta por el backend. */
  onRoleChanged?: (member: FarmMember) => void | Promise<void>;
  /** Rol preseleccionado al montar (pruebas de renderizado). */
  initialRole?: FarmRole;
  /** Abre la confirmación al montar (pruebas de renderizado). */
  initialConfirmOpen?: boolean;
  /**
   * La finca concede can_manage_members (F8). Sin confirmarlo, revocar y
   * transferir no se ofrecen.
   */
  canManage?: boolean;
  /** Revocación y transferencia (inyectables en pruebas). */
  adminApi?: MemberAdminApi;
  /** Tras una revocación confirmada por el backend (204). */
  onRevoked?: (member: FarmMember) => void | Promise<void>;
  /** Tras una transferencia, con las dos membresías devueltas por el backend. */
  onTransferred?: (result: TransferAdminResponse) => void | Promise<void>;
  /** El backend negó el permiso (403): hay que releer el acceso a la finca. */
  onAccessStale?: () => void;
  /** Diálogo abierto al montar (pruebas de renderizado). */
  initialDialog?: MemberDialog;
  /** Operación en curso al montar (pruebas de renderizado). */
  initialPending?: boolean;
  /** Error de una acción al montar (pruebas de renderizado). */
  initialActionError?: string;
};

/**
 * Ficha de solo lectura de un integrante con su historial.
 * @param props - Finca, integrante y callbacks.
 * @returns Sección de detalle.
 */
export function FarmMemberDetail({
  farmId,
  member,
  onBack,
  api = DEFAULT_API,
  initialHistory = INITIAL_HISTORY,
  changeRole = changeMemberRole,
  onRoleChanged,
  initialRole,
  initialConfirmOpen = false,
  canManage = false,
  adminApi = DEFAULT_ADMIN_API,
  onRevoked,
  onTransferred,
  onAccessStale,
  initialDialog,
  initialPending = false,
  initialActionError = "",
}: Readonly<Props>) {
  const [current, setCurrent] = useState<FarmMember>(member);
  const [confirmed, setConfirmed] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [history, dispatch] = useReducer(historyReducer, initialHistory);
  const requestSeq = useRef(0);
  const alive = useRef(true);
  const [selectedRole, setSelectedRole] = useState<FarmRole>(initialRole ?? member.role);
  // Un solo diálogo a la vez (rol, revocación o transferencia).
  const [actionState, send] = useReducer(actionReducer, undefined, () => ({
    ...INITIAL_ACTION_STATE,
    dialog: initialDialog ?? (initialConfirmOpen ? "role" : null),
    acting: initialPending && (initialDialog === "revoke" || initialDialog === "transfer"),
    error: initialActionError,
  }));
  const { dialog, acting, error: actionError, notice: actionNotice } = actionState;
  const confirmOpen = dialog === "role";
  const [changing, setChanging] = useState(initialPending && initialDialog === "role");
  const [roleError, setRoleError] = useState("");
  // Candado síncrono: el estado de React no se actualiza a tiempo ante dos
  // pulsaciones seguidas.
  const actingRef = useRef(false);
  const busy = changing || acting;

  async function openDetail() {
    const requestId = ++requestSeq.current;
    setDetailLoading(true);
    setDetailError("");
    setConfirmed(false);
    try {
      const { member: fresh, history: firstPage } = await loadMemberDetail(
        api,
        farmId,
        member.id,
      );
      if (requestId !== requestSeq.current) return;
      setCurrent(fresh);
      setSelectedRole(fresh.role);
      setConfirmed(true);
      setDetailLoading(false);
      dispatch({ type: "start", page: 1 });
      try {
        const data = await firstPage;
        if (requestId !== requestSeq.current) return;
        dispatch({ type: "success", page: 1, data });
      } catch (cause) {
        if (requestId !== requestSeq.current) return;
        dispatch({
          type: "failure",
          error: errorMessage(cause, "No se pudo cargar el historial"),
        });
      }
    } catch (cause) {
      if (requestId !== requestSeq.current) return;
      setDetailLoading(false);
      setDetailError(errorMessage(cause, "No se pudo consultar el integrante"));
    }
  }

  async function goToPage(page: number) {
    if (!confirmed) return;
    const requestId = ++requestSeq.current;
    dispatch({ type: "start", page });
    try {
      const data = await loadMemberHistoryPage(api, farmId, current, page);
      if (requestId !== requestSeq.current) return;
      dispatch({ type: "success", page, data });
    } catch (cause) {
      if (requestId !== requestSeq.current) return;
      dispatch({
        type: "failure",
        error: errorMessage(cause, "No se pudo cargar el historial"),
      });
    }
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function confirmRoleChange() {
    setChanging(true);
    setRoleError("");
    const result = await submitRoleChange(changeRole, farmId, current.id, selectedRole);
    if (result.status === "error") {
      setRoleError(result.message);
      setChanging(false);
      return;
    }
    // El PATCH tuvo éxito: se usa la membresía que devolvió el backend.
    const updated = result.member;
    setCurrent(updated);
    setSelectedRole(updated.role);
    send({ type: "cancel" });
    setChanging(false);
    await onRoleChanged?.(updated);
    // Si el cambio retiró el acceso de administrador, este detalle ya se
    // desmontó y no se vuelve a pedir el historial.
    if (alive.current) void goToPage(1);
  }

  /** Fallo común: muestra el motivo y, si el dato pudo cambiar, lo relee. */
  function actionFailed(failure: ActionFailure) {
    actingRef.current = false;
    send({ type: "fail", failure });
    // El estado mostrado pudo quedar desactualizado: se vuelve a consultar el
    // integrante en lugar de suponer el resultado.
    if (failure.reload) void openDetail();
    if (failure.staleAccess) onAccessStale?.();
  }

  /** Marca el inicio de una acción; false si ya hay otra en curso. */
  function startAction(): boolean {
    if (actingRef.current || !canStartAction(actionState)) return false;
    actingRef.current = true;
    send({ type: "start" });
    return true;
  }

  async function confirmRevoke() {
    if (!startAction()) return;
    const outcome = await submitRevoke(adminApi, farmId, current.id);
    if (outcome.status === "error") {
      actionFailed(outcome);
      return;
    }
    // 204: el backend confirmó la revocación; el listado se relee fuera.
    actingRef.current = false;
    send({ type: "done" });
    await onRevoked?.(current);
  }

  async function confirmTransfer() {
    if (!startAction()) return;
    const outcome = await submitTransfer(adminApi, farmId, current.id);
    if (outcome.status === "error") {
      actionFailed(outcome);
      return;
    }
    // Se usan las membresías que devolvió el backend, no una simulación local.
    const updated = outcome.result.new_admin;
    actingRef.current = false;
    setCurrent(updated);
    setSelectedRole(updated.role);
    send({
      type: "done",
      notice: `${updated.name || "El integrante"} ahora es ${roleLabel(updated.role)}.`,
    });
    await onTransferred?.(outcome.result);
    // Si la cuenta perdió la administración, este detalle ya se desmontó.
    if (alive.current) void goToPage(1);
  }

  useEffect(() => {
    setCurrent(member);
    void openDetail();
    return () => {
      // Invalida respuestas tardías al cerrar o cambiar de integrante.
      requestSeq.current += 1;
    };
    // Se recarga solo al cambiar de finca o de integrante (por id).
  }, [farmId, member.id]);

  const statusClass = `farm-member-status is-${current.status}`;

  return (
    <section className="farm-member-detail" aria-labelledby="farm-member-detail-title">
      <button type="button" className="btn-secondary" onClick={onBack}>
        Volver a integrantes
      </button>

      <header className="farm-member-detail__header">
        <h3 id="farm-member-detail-title" className="farm-form__title">
          {current.name || "Integrante sin nombre"}
        </h3>
        <span className={statusClass}>{membershipStatusLabel(current.status)}</span>
      </header>

      <dl className="farm-detail__meta">
        <div>
          <dt>Rol</dt>
          <dd>{roleLabel(current.role)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{membershipStatusLabel(current.status)}</dd>
        </div>
        <div>
          <dt>Creada</dt>
          <dd>{formatDate(current.created_at)}</dd>
        </div>
        <div>
          <dt>Actualizada</dt>
          <dd>{formatDate(current.updated_at)}</dd>
        </div>
      </dl>

      {detailLoading ? (
        <p className="farm-state" role="status">
          Consultando integrante...
        </p>
      ) : null}

      {!detailLoading && detailError ? (
        <div className="farm-state" role="alert">
          <p>{detailError}</p>
          <button type="button" className="btn-primary" onClick={() => void openDetail()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <section className="farm-form farm-member-role" aria-labelledby="farm-member-role-title">
        <h4 id="farm-member-role-title" className="farm-form__title">
          Rol en la finca
        </h4>
        {canChangeRole(current) ? (
          <>
            <div className="farm-members__filters" role="radiogroup" aria-label="Rol">
              {ROLE_OPTIONS.map((option) => {
                const checked = option === selectedRole;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    data-role={option}
                    className={
                      checked ? "farm-members__filter is-active" : "farm-members__filter"
                    }
                    disabled={busy || !confirmed}
                    onClick={() => {
                      setSelectedRole(option);
                      setRoleError("");
                    }}
                  >
                    {roleLabel(option)}
                    {option === current.role ? " (actual)" : ""}
                  </button>
                );
              })}
            </div>
            {roleError && !confirmOpen ? (
              <p className="farm-form__error" role="alert">
                {roleError}
              </p>
            ) : null}
            <div className="farm-form__actions">
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !confirmed || !isRoleChange(current, selectedRole)}
                onClick={() => {
                  setRoleError("");
                  send({ type: "open", dialog: "role" });
                }}
              >
                Cambiar rol
              </button>
            </div>
          </>
        ) : (
          <p className="farm-empty__hint">
            Solo se puede cambiar el rol de una membresía activa.
          </p>
        )}
      </section>

      {canManage ? (
        <section
          className="farm-form farm-member-actions"
          aria-labelledby="farm-member-actions-title"
        >
          <h4 id="farm-member-actions-title" className="farm-form__title">
            Administración del integrante
          </h4>
          {actionNotice ? (
            <p className="farm-empty__hint" role="status">
              {actionNotice}
            </p>
          ) : null}
          {actionError && dialog === null ? (
            <p className="farm-form__error" role="alert">
              {actionError}
            </p>
          ) : null}
          {canRevoke(current) ? (
            <>
              {isTransferEligible(current) ? (
                <div className="farm-member-actions__item">
                  <p className="farm-empty__hint">
                    Pasa la administración a este integrante; tú quedarás como Operador.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    data-action="transfer"
                    disabled={busy || !confirmed}
                    onClick={() => send({ type: "open", dialog: "transfer" })}
                  >
                    Transferir administración
                  </button>
                </div>
              ) : null}
              <div className="farm-member-actions__item">
                <p className="farm-empty__hint">
                  Retira el acceso de este integrante a la finca.
                </p>
                <button
                  type="button"
                  className="btn-danger"
                  data-action="revoke"
                  disabled={busy || !confirmed}
                  onClick={() => send({ type: "open", dialog: "revoke" })}
                >
                  Revocar acceso
                </button>
              </div>
            </>
          ) : (
            <p className="farm-empty__hint">
              Solo una membresía activa se puede revocar o recibir la administración.
            </p>
          )}
        </section>
      ) : null}

      <section className="farm-history" aria-label="Historial del integrante">
        <h4 className="farm-form__title">Historial del integrante</h4>
        <HistoryEvents
          view={historyView(history, MEMBER_HISTORY_PAGE_SIZE)}
          emptyText="Este integrante no tiene eventos registrados."
          onPage={(page) => void goToPage(page)}
          onRetry={() => void goToPage(history.page)}
        />
      </section>
      <ConfirmDialog
        open={confirmOpen}
        tone={roleChangeCopy(current, selectedRole).tone}
        title={roleChangeCopy(current, selectedRole).title}
        description={
          <>
            {roleChangeCopy(current, selectedRole).body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </>
        }
        confirmLabel={roleChangeCopy(current, selectedRole).confirm}
        pendingLabel="Cambiando rol..."
        loading={changing}
        error={roleError}
        onConfirm={confirmRoleChange}
        onCancel={() => {
          send({ type: "cancel" });
          setRoleError("");
        }}
      />
      {canManage ? (
        <ConfirmDialog
          open={dialog === "revoke"}
          tone="warning"
          title={revokeCopy(current).title}
          description={
            <>
              {revokeCopy(current).body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </>
          }
          confirmLabel={revokeCopy(current).confirm}
          pendingLabel={revokeCopy(current).pending}
          loading={acting}
          error={actionError}
          onConfirm={confirmRevoke}
          onCancel={() => send({ type: "cancel" })}
        />
      ) : null}
      {canManage ? (
        <ConfirmDialog
          open={dialog === "transfer"}
          tone="warning"
          title={transferCopy(current).title}
          description={
            <>
              {transferCopy(current).body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </>
          }
          confirmLabel={transferCopy(current).confirm}
          pendingLabel={transferCopy(current).pending}
          loading={acting}
          error={actionError}
          onConfirm={confirmTransfer}
          onCancel={() => send({ type: "cancel" })}
        />
      ) : null}
    </section>
  );
}

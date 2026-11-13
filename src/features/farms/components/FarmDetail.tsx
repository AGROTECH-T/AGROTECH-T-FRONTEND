/**
 * Detalle de una finca.
 *
 * Propósito: organizar la ficha en pestañas (Resumen, Integrantes,
 * Invitaciones, Historial y Configuración); editar, desactivar o reactivar
 * (administrador) y abandonar la finca (cualquier integrante).
 * Distribución: banner con nombre, rol y estado; Resumen solo de lectura; los
 * cambios sobre la finca viven en la pestaña Configuración, en tarjetas
 * horizontales.
 * Contexto: PUT/DELETE/reactivate solo para administrador; DELETE es baja
 * lógica y el detalle sigue abierto para poder reactivar.
 * La visibilidad de pestañas es comodidad de interfaz: el backend autoriza.
 * Tras un cambio de rol se relee la finca para conocer el rol real de la
 * cuenta; mientras no se confirme, las opciones de administración se ocultan.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import "../../../styles/farm-detail.css";
import {
  deleteFarm,
  getFarm,
  leaveFarm,
  reactivateFarm,
  updateFarm,
} from "../services/farmsApi.ts";
import {
  canDeactivate,
  canEditName,
  canLeave,
  canReactivate,
  deactivateFarm as deactivateFlow,
  leaveErrorMessage,
  leaveFarm as leaveFlow,
  reactivateFarm as reactivateFlow,
  type LifecycleApi,
} from "../services/farmLifecycle.ts";
import { unconfirmedAccessView } from "../services/capabilityGuards.ts";
import fincaArt from "../../../assets/onboard-finca.webp";
import { detailTabs, resolveTab, tabForKey, type FarmTabId } from "../services/farmTabs.ts";
import { canManageInvitations } from "../services/invitationAdmin.ts";
import {
  canManageMembers,
  memberChangeNotice,
  revokedText,
  transferredText,
} from "../services/memberAdmin.ts";
import { accessNotice, refreshAccess, type AccessRefresh } from "../services/roleChange.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type { Farm, FarmMember } from "../types/index.ts";
import { DetailIcon, type DetailIconName } from "./DetailIcon.tsx";
import { FarmHistory } from "./FarmHistory.tsx";
import { FarmInvitations } from "./FarmInvitations.tsx";
import { FarmMembers } from "./FarmMembers.tsx";
import { FarmOverview } from "./FarmOverview.tsx";

const DEFAULT_API: LifecycleApi = { getFarm, deleteFarm, reactivateFarm, leaveFarm };

const TAB_ICONS: Record<FarmTabId, DetailIconName> = {
  resumen: "grid",
  integrantes: "users",
  invitaciones: "mail",
  historial: "history",
  configuracion: "gear",
};

type LifecycleAction = "deactivate" | "reactivate" | "leave";

const DIALOG: Record<
  LifecycleAction,
  { title: (name: string) => string; body: string; confirm: string; pending: string }
> = {
  deactivate: {
    title: (name) => `¿Desactivar la finca "${name}"?`,
    body:
      "Dejará de estar operativa, pero no se eliminará. Se conservarán sus datos " +
      "históricos, membresías e inventario. Podrás reactivarla desde este detalle.",
    confirm: "Desactivar finca",
    pending: "Desactivando...",
  },
  reactivate: {
    title: (name) => `¿Reactivar la finca "${name}"?`,
    body: "Volverá a estar operativa y aparecerá de nuevo en tu listado de fincas.",
    confirm: "Reactivar finca",
    pending: "Reactivando...",
  },
  leave: {
    title: (name) => `¿Abandonar la finca "${name}"?`,
    body:
      "Perderás el acceso a esta finca y tus permisos en ella. Para volver necesitarás " +
      "una nueva invitación de un administrador.",
    confirm: "Abandonar finca",
    pending: "Abandonando...",
  },
};

type Props = {
  farm: Farm;
  onBack: () => void;
  /** La finca cambió (nombre, desactivación o reactivación); el detalle sigue abierto. */
  onUpdated: (farm: Farm) => void;
  /** La cuenta abandonó la finca; ya no tiene acceso a ella. */
  onLeft: (farmId: number) => void;
  /** Operaciones HTTP del ciclo de vida (inyectables en pruebas). */
  api?: LifecycleApi;
  /** Pestaña inicial (por defecto Resumen). */
  initialTab?: FarmTabId;
  /** Muestra un aviso en la pila de notificaciones de la pantalla. */
  onNotice?: (text: string, tone: "ok" | "warn") => void;
  /** Acceso pendiente de confirmar al montar (pruebas de renderizado). */
  initialAccessPending?: boolean;
};

function validateName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Escribe el nombre de la finca.";
  if (trimmed.length > 100) return "Máximo 100 caracteres.";
  return "";
}

/**
 * Ficha de una finca con pestañas y acciones de administrador.
 */
export function FarmDetail({
  farm,
  onBack,
  onUpdated,
  onLeft,
  api = DEFAULT_API,
  initialTab = "resumen",
  onNotice,
  initialAccessPending = false,
}: Readonly<Props>) {
  // Si un cambio de rol se guardó pero no se pudo releer la finca, no se
  // conoce el rol real de la cuenta: se calcula la vista sin permisos de
  // administración hasta confirmarlo (nunca permisos ficticios).
  const [accessPending, setAccessPending] = useState(initialAccessPending);
  const [accessRefreshing, setAccessRefreshing] = useState(false);
  // Sin acceso confirmado no se conserva ninguna capacidad anterior (F6).
  const view: Farm = accessPending ? unconfirmedAccessView(farm) : farm;
  const isAdmin = view.role === "administrador";
  const hasSettings =
    canEditName(view) || canDeactivate(view) || canReactivate(view) || canLeave(view);
  const tabs = detailTabs(view, hasSettings);
  const tabVisible = (id: FarmTabId) => tabs.some((tab) => tab.id === id);
  const roleText = accessPending ? "pendiente de confirmar" : roleLabel(farm.role);
  const [requestedTab, setRequestedTab] = useState<FarmTabId>(initialTab);
  const activeTab = resolveTab(tabs, requestedTab);
  // Las pestañas se montan al visitarlas por primera vez y luego se conservan.
  const [visited, setVisited] = useState<ReadonlySet<FarmTabId>>(() => new Set([activeTab]));
  const tabRefs = useRef<Partial<Record<FarmTabId, HTMLButtonElement | null>>>({});
  const baseId = useId();

  const [name, setName] = useState(farm.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [gap, setGap] = useState("");
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [confirmError, setConfirmError] = useState("");

  useEffect(() => {
    setName(farm.name);
    setError("");
    setGap("");
  }, [farm.id, farm.name]);

  useEffect(() => {
    setRequestedTab(initialTab);
    setVisited(new Set([initialTab]));
  }, [farm.id, initialTab]);

  // Al cambiar el estado de la finca cambian las pestañas visibles: se
  // descartan las secciones ya cargadas para no mostrar datos anteriores.
  const lastActive = useRef(farm.is_active);
  useEffect(() => {
    if (lastActive.current === farm.is_active) return;
    lastActive.current = farm.is_active;
    setRequestedTab("resumen");
    setVisited(new Set(["resumen"]));
  }, [farm.is_active]);

  function backToSummary() {
    setRequestedTab("resumen");
    setVisited(new Set(["resumen"]));
  }

  /** Aplica el acceso releído: sin confirmarlo, se ocultan las opciones de administración. */
  function applyAccess(result: AccessRefresh) {
    if (result.status === "ok") {
      setAccessPending(false);
      if (result.lostAdmin) backToSummary();
      onUpdated(result.farm);
    } else {
      setAccessPending(true);
      backToSummary();
    }
  }

  /**
   * Tras revocar o transferir (F8) se relee GET /farms/{id}/: la
   * transferencia deja a la cuenta como Operador y sus capacidades cambian.
   */
  async function refreshAfterMemberChange(successText: string) {
    setAccessRefreshing(true);
    const result = await refreshAccess(api.getFarm, farm);
    setAccessRefreshing(false);
    applyAccess(result);
    const notice = memberChangeNotice(successText, result);
    onNotice?.(notice.text, notice.tone);
  }

  /** Relee la finca tras un cambio de rol exitoso y ajusta el acceso. */
  async function syncAccess(member: FarmMember | null) {
    setAccessRefreshing(true);
    const result = await refreshAccess(api.getFarm, farm);
    setAccessRefreshing(false);
    applyAccess(result);
    if (member) {
      const notice = accessNotice(member, result);
      onNotice?.(notice.text, notice.tone);
    } else if (result.status === "ok") {
      onNotice?.(
        result.lostAdmin
          ? accessNotice({ name: "", role: result.farm.role }, result).text
          : "Acceso a la finca actualizado.",
        result.lostAdmin ? "warn" : "ok",
      );
    } else {
      onNotice?.(`No se pudo actualizar tu acceso: ${result.error}`, "warn");
    }
  }

  function selectTab(id: FarmTabId, focus = false) {
    setRequestedTab(id);
    setVisited((current) => (current.has(id) ? current : new Set([...current, id])));
    if (focus) tabRefs.current[id]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = tabForKey(tabs, activeTab, event.key);
    if (!next) return;
    event.preventDefault();
    selectTab(next, true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const message = validateName(name);
    setGap(message);
    if (message) return;

    setPending(true);
    setError("");
    try {
      const updated = await updateFarm(farm.id, name.trim());
      onUpdated(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  function openAction(next: LifecycleAction) {
    setConfirmError("");
    setAction(next);
  }

  function closeAction() {
    setAction(null);
    setConfirmError("");
  }

  async function runAction() {
    if (!action) return;
    setPending(true);
    setConfirmError("");
    try {
      if (action === "leave") {
        await leaveFlow(api, farm);
        setAction(null);
        onLeft(farm.id);
        return;
      }
      const updated =
        action === "deactivate"
          ? await deactivateFlow(api, farm)
          : await reactivateFlow(api, farm);
      setAction(null);
      onUpdated(updated);
    } catch (cause) {
      if (action === "leave") {
        setConfirmError(leaveErrorMessage(cause, farm));
      } else {
        setConfirmError(
          cause instanceof Error ? cause.message : "No se pudo completar la operación",
        );
      }
    } finally {
      setPending(false);
    }
  }

  const tabId = (id: FarmTabId) => `${baseId}-tab-${id}`;
  const panelId = (id: FarmTabId) => `${baseId}-panel-${id}`;

  const summary = (
    <FarmOverview
      farm={farm}
      roleText={roleText}
      showMembers={tabVisible("integrantes")}
      showInvitations={tabVisible("invitaciones")}
      showHistory={tabVisible("historial")}
      canReactivate={canReactivate(view)}
      onOpenTab={(id) => selectTab(id)}
    />
  );

  // Configuración: tarjetas horizontales con las acciones sobre la finca.
  const settings = (
    <div className="farm-settings">
      {canEditName(view) ? (
        <form
          className="farm-form farm-settings__card"
          onSubmit={(event) => void save(event)}
          noValidate
        >
          <span className="farm-settings__icon" aria-hidden="true">
            <DetailIcon name="pencil" />
          </span>
          <h3 className="farm-form__title">Editar nombre</h3>
          <p className="farm-empty__hint">Lo ven todos los integrantes de la finca.</p>
          <label className="farm-form__field">
            Nombre
            <input
              type="text"
              name="name"
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              autoComplete="off"
            />
          </label>
          {gap ? <span className="farm-form__gap">{gap}</span> : null}
          {error ? (
            <p className="farm-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="farm-form__actions">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      ) : null}

      {canDeactivate(view) ? (
        <div className="farm-form farm-settings__card">
          <span className="farm-settings__icon" aria-hidden="true">
            <DetailIcon name="power" />
          </span>
          <h3 className="farm-form__title">Desactivar finca</h3>
          <p className="farm-empty__hint">
            Dejará de estar operativa, pero se conservan sus datos. Podrás reactivarla.
          </p>
          <div className="farm-form__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => openAction("deactivate")}
              disabled={pending}
            >
              Desactivar finca
            </button>
          </div>
        </div>
      ) : null}

      {canReactivate(view) ? (
        <div className="farm-form farm-settings__card">
          <span className="farm-settings__icon" aria-hidden="true">
            <DetailIcon name="refresh" />
          </span>
          <h3 className="farm-form__title">Reactivar finca</h3>
          <p className="farm-empty__hint">
            Volverá a estar operativa y aparecerá de nuevo en tu listado de fincas.
          </p>
          <div className="farm-form__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => openAction("reactivate")}
              disabled={pending}
            >
              Reactivar finca
            </button>
          </div>
        </div>
      ) : null}

      {canLeave(view) ? (
        <div className="farm-form farm-lifecycle farm-settings__card is-danger">
          <span className="farm-settings__icon" aria-hidden="true">
            <DetailIcon name="logout" />
          </span>
          <h3 className="farm-form__title">Abandonar finca</h3>
          <p className="farm-empty__hint">
            Dejarás de tener acceso a esta finca. Para volver necesitarás una nueva
            invitación.
          </p>
          <div className="farm-form__actions">
            <button
              type="button"
              className="btn-danger"
              onClick={() => openAction("leave")}
              disabled={pending}
            >
              Abandonar finca
            </button>
          </div>
        </div>
      ) : null}

      {!isAdmin && error ? (
        <p className="farm-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );

  function renderPanel(id: FarmTabId) {
    if (id === "resumen") return summary;
    if (id === "configuracion") return settings;
    if (id === "integrantes") {
      return (
        <FarmMembers
          farmId={farm.id}
          autoOpen
          onRoleChanged={(member) => syncAccess(member)}
          canManage={canManageMembers(view)}
          onMemberRevoked={(member) => refreshAfterMemberChange(revokedText(member))}
          onAdminTransferred={(result) => refreshAfterMemberChange(transferredText(result))}
          onAccessStale={() => void syncAccess(null)}
        />
      );
    }
    if (id === "historial") return <FarmHistory farmId={farm.id} autoOpen />;
    return (
      <FarmInvitations
        farmId={farm.id}
        onNotice={onNotice}
        canManage={canManageInvitations(view)}
        onAccessStale={() => void syncAccess(null)}
      />
    );
  }

  return (
    <section className="farm-detail" aria-labelledby="farm-detail-title">
      <header className="farm-detail-hero">
        <button
          type="button"
          className="btn-secondary farm-detail-hero__back"
          onClick={onBack}
          disabled={pending}
        >
          <DetailIcon name="arrow-left" />
          Volver al listado
        </button>
        <span className="farm-detail-hero__art" aria-hidden="true">
          <img src={fincaArt} alt="" width={36} height={36} decoding="async" />
        </span>
        <div className="farm-detail-hero__text">
          <div className="farm-detail-hero__title">
            <h2 id="farm-detail-title" className="panel__title">
              {farm.name}
            </h2>
            {accessPending ? null : (
              <span className="farm-card__role" data-role={farm.role}>
                {roleLabel(farm.role)}
              </span>
            )}
            <span className="overview-status" data-active={farm.is_active ? "true" : "false"}>
              {farm.is_active ? "Activa" : "Desactivada"}
            </span>
          </div>
          <p className="panel__lead">Tu rol en esta finca: {roleText}</p>
        </div>
      </header>

      {accessPending ? (
        <div className="farm-state farm-lifecycle" role="alert">
          <p className="farm-empty__title">No se pudo confirmar tu acceso</p>
          <p className="farm-empty__hint">
            El cambio de rol se guardó, pero no se pudo actualizar tu acceso a la finca. Las
            opciones de administración quedan ocultas hasta confirmarlo.
          </p>
          <div className="farm-lifecycle__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void syncAccess(null)}
              disabled={accessRefreshing}
            >
              {accessRefreshing ? "Actualizando..." : "Actualizar acceso"}
            </button>
          </div>
        </div>
      ) : null}

      {tabs.length > 1 ? (
        <div className="farm-tabs" role="tablist" aria-label="Secciones de la finca">
          {tabs.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                type="button"
                role="tab"
                id={tabId(tab.id)}
                aria-selected={selected}
                aria-controls={panelId(tab.id)}
                tabIndex={selected ? 0 : -1}
                className={selected ? "farm-tabs__tab is-active" : "farm-tabs__tab"}
                onClick={() => selectTab(tab.id)}
                onKeyDown={onTabKeyDown}
              >
                <DetailIcon name={TAB_ICONS[tab.id]} />
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {tabs.map((tab) => {
        const selected = tab.id === activeTab;
        if (!selected && !visited.has(tab.id)) return null;
        return (
          <div
            key={tab.id}
            className="farm-tabs__panel"
            data-tab={tab.id}
            role={tabs.length > 1 ? "tabpanel" : undefined}
            id={panelId(tab.id)}
            aria-labelledby={tabs.length > 1 ? tabId(tab.id) : undefined}
            hidden={!selected}
          >
            {renderPanel(tab.id)}
          </div>
        );
      })}

      <ConfirmDialog
        open={action !== null}
        tone={action === "reactivate" ? "default" : "warning"}
        title={action ? DIALOG[action].title(farm.name) : ""}
        description={action ? <p>{DIALOG[action].body}</p> : null}
        confirmLabel={action ? DIALOG[action].confirm : undefined}
        pendingLabel={action ? DIALOG[action].pending : undefined}
        loading={pending}
        error={confirmError}
        onConfirm={runAction}
        onCancel={closeAction}
      />
    </section>
  );
}

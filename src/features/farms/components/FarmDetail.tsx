/**
 * Detalle de una finca.
 *
 * Propósito: cabecera con nombre/estado/rol y una barra de pestañas igual a
 * la del listado (Todas / roles), con: Inventarios, Galpones, Integrantes,
 * Invitaciones, Historial y Configuración. Cada pestaña muestra solo su
 * contenido.
 * Contexto: PUT/DELETE/reactivate solo para administrador. Tras un cambio de
 * rol se relee la finca; mientras no se confirme, se ocultan opciones de
 * administración.
 * @author Cristian Deysdayr Jimenez
 */

import { CharLeft } from "../../../components/ui/CharLeft.tsx";
import { textCap } from "../../../limits.ts";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { BackButton } from "../../../components/ui/BackButton.tsx";
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
import { shortDate } from "../services/farmFilter.ts";
import fincaIcon from "../../../assets/icons/finca.png";
import { detailTabs, resolveTab, type FarmTabId } from "../services/farmTabs.ts";
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
import { DetailIcon } from "./DetailIcon.tsx";
import { FarmHistory } from "./FarmHistory.tsx";
import { FarmInvitations } from "./FarmInvitations.tsx";
import { FarmMembers } from "./FarmMembers.tsx";
import { FarmModuleAccess } from "./FarmModuleAccess.tsx";
import { FarmOverview } from "./FarmOverview.tsx";

const DEFAULT_API: LifecycleApi = { getFarm, deleteFarm, reactivateFarm, leaveFarm };

type LifecycleAction = "deactivate" | "reactivate" | "leave";

const DIALOG: Record<
  LifecycleAction,
  { title: (name: string) => string; body: string; confirm: string; pending: string }
> = {
  deactivate: {
    title: (name) => `¿Desactivar la finca "${name}"?`,
    body:
      "Dejará de estar operativa, pero no se eliminará. Se conservarán sus datos " +
      "históricos, membresías e inventario. Podrás reactivarla desde Configuración → Reactivar fincas.",
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
  onUpdated: (farm: Farm) => void;
  onLeft: (farmId: number) => void;
  api?: LifecycleApi;
  initialTab?: FarmTabId;
  onNotice?: (text: string, tone: "ok" | "warn") => void;
  initialAccessPending?: boolean;
  onOpenInventory?: (inventoryId?: string) => void;
  onOpenGalpon?: (houseId?: number) => void;
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
  initialTab = "inventarios",
  onNotice,
  initialAccessPending = false,
  onOpenInventory,
  onOpenGalpon,
}: Readonly<Props>) {
  const [accessPending, setAccessPending] = useState(initialAccessPending);
  const [accessRefreshing, setAccessRefreshing] = useState(false);
  const view: Farm = accessPending ? unconfirmedAccessView(farm) : farm;
  const isAdmin = view.role === "administrador";
  const hasSettings =
    canEditName(view) || canDeactivate(view) || canReactivate(view) || canLeave(view);
  const sections = detailTabs(view, hasSettings);
  const roleText = accessPending ? "pendiente de confirmar" : roleLabel(farm.role);
  const createdText = shortDate(farm.created_at);
  const [tab, setTab] = useState<FarmTabId>(() => resolveTab(sections, initialTab));
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

  const sectionKey = sections.map((item) => item.id).join("|");

  useEffect(() => {
    setTab(resolveTab(detailTabs(view, hasSettings), initialTab));
  }, [farm.id, farm.role, farm.is_active, farm.capabilities, accessPending, hasSettings, initialTab]);

  const lastActive = useRef(farm.is_active);
  useEffect(() => {
    if (lastActive.current === farm.is_active) return;
    lastActive.current = farm.is_active;
    setTab(resolveTab(sections, "inventarios"));
  }, [farm.is_active, sectionKey, sections]);

  useEffect(() => {
    setTab((current) => resolveTab(sections, current));
  }, [sectionKey, sections]);

  function backToModules() {
    setTab(resolveTab(sections, "inventarios"));
  }

  function applyAccess(result: AccessRefresh) {
    if (result.status === "ok") {
      setAccessPending(false);
      if (result.lostAdmin) backToModules();
      onUpdated(result.farm);
    } else {
      setAccessPending(true);
      backToModules();
    }
  }

  async function refreshAfterMemberChange(successText: string) {
    setAccessRefreshing(true);
    const result = await refreshAccess(api.getFarm, farm);
    setAccessRefreshing(false);
    applyAccess(result);
    const notice = memberChangeNotice(successText, result);
    onNotice?.(notice.text, notice.tone);
  }

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

  const panelId = `${baseId}-panel`;

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
          <div className="farm-form__block">
            <label className="farm-form__field">
              Nombre
              <input
                type="text"
                name="name"
                maxLength={textCap(name)}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={pending}
                autoComplete="off"
              />
              <CharLeft value={name} max={textCap(name)} />
            </label>
          </div>
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
            Dejará de estar operativa, pero se conservan sus datos. Luego podrás
            reactivarla aquí o en Configuración → Reactivar fincas.
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

  function renderTab(id: FarmTabId) {
    if (id === "inventarios") {
      return onOpenInventory && onOpenGalpon ? (
        <FarmModuleAccess
          farmId={farm.id}
          farmActive={farm.is_active}
          kind="inventarios"
          onOpenInventory={onOpenInventory}
          onOpenGalpon={onOpenGalpon}
        />
      ) : (
        <p className="farm-access__hint">No hay acceso al módulo de inventarios.</p>
      );
    }
    if (id === "galpones") {
      return onOpenInventory && onOpenGalpon ? (
        <FarmModuleAccess
          farmId={farm.id}
          farmActive={farm.is_active}
          kind="galpones"
          onOpenInventory={onOpenInventory}
          onOpenGalpon={onOpenGalpon}
        />
      ) : (
        <p className="farm-access__hint">No hay acceso al módulo de galpones.</p>
      );
    }
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
      <header className="farm-detail__hero">
        <BackButton onClick={onBack} disabled={pending} />
        <div className="farm-detail__identity">
          <span className="farm-detail__art" aria-hidden="true">
            <img src={fincaIcon} alt="" width={28} height={28} decoding="async" />
          </span>
          <div className="farm-detail__titles">
            <div className="farm-detail__title-row">
              <h2 id="farm-detail-title" className="panel__title">
                {farm.name}
              </h2>
              <span className="overview-status" data-active={farm.is_active ? "true" : "false"}>
                {farm.is_active ? "Activa" : "Desactivada"}
              </span>
            </div>
            <p className="panel__lead farm-detail__role">
              Tu rol en esta finca: {roleText}
              {createdText ? ` · Creada el ${createdText}` : ""}
            </p>
          </div>
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

      <FarmOverview farm={farm} canReactivate={canReactivate(view)} />

      <div className="farm-roles farm-detail__tabs" role="tablist" aria-label="Secciones de la finca">
        {sections.map((section) => {
          const selected = tab === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${section.id}`}
              className="farm-roles__option"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        className="farm-detail__panel"
        role="tabpanel"
        data-section={tab}
        aria-labelledby={`${baseId}-tab-${tab}`}
      >
        {renderTab(tab)}
      </div>

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

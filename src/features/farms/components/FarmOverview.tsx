/**
 * Resumen de solo lectura de una finca.
 *
 * Propósito: mostrar datos de la finca, el acceso de la cuenta y, para quien
 * puede verlos, un vistazo de integrantes, invitaciones y actividad reciente.
 * Distribución: fila de datos; tarjetas de acceso, integrantes e invitaciones
 * lado a lado; actividad reciente debajo. Nada aquí modifica la finca:
 * editar, desactivar, reactivar y abandonar viven en la pestaña Configuración.
 * Contexto: cada bloque consulta solo si la capacidad lo permite (el backend
 * vuelve a autorizar); un fallo en un bloque no afecta a los demás.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type ReactNode } from "react";
import { describeEvent } from "../services/eventDescription.ts";
import { listFarmHistory, listFarmMembers } from "../services/farmsApi.ts";
import { shortDate } from "../services/farmFilter.ts";
import type { FarmTabId } from "../services/farmTabs.ts";
import { listInvitations } from "../services/invitationsApi.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type {
  AuditEvent,
  Farm,
  FarmInvitation,
  FarmMember,
  FarmMembersResponse,
  HistoryPage,
} from "../types/index.ts";
import { DetailIcon, type DetailIconName } from "./DetailIcon.tsx";

/** Llamadas de lectura del resumen (inyectables en pruebas). */
export type OverviewApi = {
  listMembers: (farmId: number) => Promise<FarmMembersResponse>;
  listInvitations: (farmId: number) => Promise<FarmInvitation[]>;
  listHistory: (farmId: number) => Promise<HistoryPage>;
};

const PREVIEW_SIZE = 3;

const DEFAULT_API: OverviewApi = {
  listMembers: (farmId) => listFarmMembers(farmId, "active", "", 1, PREVIEW_SIZE),
  listInvitations,
  listHistory: (farmId) => listFarmHistory(farmId, 1, PREVIEW_SIZE),
};

type Load<T> = { kind: "loading" } | { kind: "error" } | { kind: "ok"; data: T };

/** Consulta si `enabled`; si no, queda en carga sin pedir nada. */
function useLoad<T>(
  enabled: boolean,
  farmId: number,
  fetcher: (farmId: number) => Promise<T>,
): Load<T> {
  const [state, setState] = useState<Load<T>>({ kind: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setState({ kind: "loading" });
    fetcher(farmId)
      .then((data) => {
        if (alive) setState({ kind: "ok", data });
      })
      .catch(() => {
        if (alive) setState({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [enabled, farmId, fetcher]);
  return state;
}

/** @returns Conteo de invitaciones por estado y la más reciente. */
export function invitationStats(invitations: readonly FarmInvitation[]) {
  const latest =
    [...invitations].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    total: invitations.length,
    accepted: invitations.filter((item) => item.status === "accepted").length,
    pending: invitations.filter((item) => item.status === "pending").length,
    latest,
  };
}

const INVITATION_STATUS: Record<FarmInvitation["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  cancelled: "Cancelada",
  expired: "Vencida",
};

/** @returns Iniciales (máx. 2) para el avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

function Card({
  icon,
  title,
  extra,
  children,
}: Readonly<{ icon: DetailIconName; title: string; extra?: ReactNode; children: ReactNode }>) {
  return (
    <section className="overview-card">
      <h3 className="overview-card__title">
        <span className="overview-card__icon">
          <DetailIcon name={icon} />
        </span>
        {title}
        {extra}
      </h3>
      {children}
    </section>
  );
}

function LoadState({ load, empty }: Readonly<{ load: Load<unknown>; empty?: string }>) {
  if (load.kind === "loading") return <p className="overview-card__state">Cargando...</p>;
  if (load.kind === "error") return <p className="overview-card__state">No se pudo cargar.</p>;
  return empty ? <p className="overview-card__state">{empty}</p> : null;
}

function MoreLink({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button type="button" className="overview-card__more" onClick={onClick}>
      {label}
      <DetailIcon name="arrow-right" />
    </button>
  );
}

function MembersCard({
  load,
  onOpen,
}: Readonly<{ load: Load<FarmMembersResponse>; onOpen: () => void }>) {
  const data = load.kind === "ok" ? load.data : null;
  return (
    <Card
      icon="users"
      title="Integrantes"
      extra={data ? <span className="overview-count">{data.count}</span> : null}
    >
      {data && data.results.length > 0 ? (
        <ul className="overview-people">
          {data.results.map((member: FarmMember) => (
            <li key={member.id} className="overview-person">
              <span className="overview-person__avatar" data-role={member.role} aria-hidden="true">
                {initials(member.name)}
              </span>
              <span className="overview-person__text">
                <span className="overview-person__name">{member.name}</span>
                <span className="overview-person__meta">Desde el {shortDate(member.created_at)}</span>
              </span>
              <span className="farm-card__role" data-role={member.role}>
                {roleLabel(member.role)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <LoadState load={load} empty={data ? "Aún no hay integrantes activos." : undefined} />
      )}
      <MoreLink label="Ver integrantes" onClick={onOpen} />
    </Card>
  );
}

function InvitationsCard({
  load,
  onOpen,
}: Readonly<{ load: Load<FarmInvitation[]>; onOpen: () => void }>) {
  const stats = load.kind === "ok" ? invitationStats(load.data) : null;
  return (
    <Card icon="mail" title="Invitaciones">
      {stats ? (
        <>
          <div className="overview-tally">
            <span>
              <strong>{stats.total}</strong>Enviadas
            </span>
            <span>
              <strong>{stats.accepted}</strong>Aceptadas
            </span>
            <span>
              <strong>{stats.pending}</strong>Pendientes
            </span>
          </div>
          {stats.latest ? (
            <dl className="overview-facts">
              <div>
                <dt>Última invitación</dt>
                <dd>{stats.latest.email}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  <span className="farm-card__role" data-role={stats.latest.role}>
                    {roleLabel(stats.latest.role)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{INVITATION_STATUS[stats.latest.status]}</dd>
              </div>
            </dl>
          ) : (
            <p className="overview-card__state">Aún no hay invitaciones en esta finca.</p>
          )}
        </>
      ) : (
        <LoadState load={load} />
      )}
      <MoreLink label="Ver invitaciones" onClick={onOpen} />
    </Card>
  );
}

function ActivityCard({
  load,
  onOpen,
}: Readonly<{ load: Load<HistoryPage>; onOpen: () => void }>) {
  const events = load.kind === "ok" ? load.data.results : null;
  return (
    <Card icon="history" title="Actividad reciente">
      {events && events.length > 0 ? (
        <ol className="overview-timeline">
          {events.map((event: AuditEvent, index) => (
            <li key={`${event.created_at}-${event.event_type}-${index}`}>
              <span className="overview-timeline__head">
                <strong>{event.event_type_label}</strong>
                <span>{shortDate(event.created_at)}</span>
              </span>
              <span className="overview-timeline__desc">{describeEvent(event)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <LoadState load={load} empty={events ? "No hay eventos registrados." : undefined} />
      )}
      <MoreLink label="Ver historial completo" onClick={onOpen} />
    </Card>
  );
}

type Props = {
  farm: Farm;
  /** Rol mostrado (puede estar pendiente de confirmar). */
  roleText: string;
  showMembers: boolean;
  showInvitations: boolean;
  showHistory: boolean;
  /** Puede reactivar: el aviso de finca desactivada remite a Configuración. */
  canReactivate: boolean;
  onOpenTab: (tab: FarmTabId) => void;
  api?: OverviewApi;
};

/**
 * Resumen de solo lectura.
 * @param props - Finca, qué bloques mostrar y navegación entre pestañas.
 * @returns Contenido de la pestaña Resumen.
 */
export function FarmOverview({
  farm,
  roleText,
  showMembers,
  showInvitations,
  showHistory,
  canReactivate,
  onOpenTab,
  api = DEFAULT_API,
}: Readonly<Props>) {
  const members = useLoad(showMembers, farm.id, api.listMembers);
  const invitations = useLoad(showInvitations, farm.id, api.listInvitations);
  const history = useLoad(showHistory, farm.id, api.listHistory);

  const facts: { icon: DetailIconName; label: string; value: ReactNode }[] = [
    { icon: "id", label: "Identificador", value: farm.id },
    { icon: "calendar", label: "Creada", value: shortDate(farm.created_at) || "—" },
    { icon: "refresh", label: "Actualizada", value: shortDate(farm.updated_at) || "—" },
    {
      icon: "pulse",
      label: "Estado",
      value: (
        <span className="overview-status" data-active={farm.is_active ? "true" : "false"}>
          {farm.is_active ? "Activa" : "Desactivada"}
        </span>
      ),
    },
  ];
  if (farm.deactivated_at) {
    facts.push({
      icon: "power",
      label: "Desactivada el",
      value: shortDate(farm.deactivated_at) || "—",
    });
  }

  return (
    <div className="farm-overview">
      <p className="overview-readonly">Solo lectura</p>

      <dl className="farm-detail__meta overview-facts-row">
        {facts.map((fact) => (
          <div key={fact.label} className="overview-fact">
            <span className="overview-fact__icon" aria-hidden="true">
              <DetailIcon name={fact.icon} />
            </span>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {farm.is_active ? null : (
        <div className="farm-state farm-lifecycle" role="status">
          <p className="farm-empty__title">Finca desactivada</p>
          <p className="farm-empty__hint">
            {canReactivate
              ? "No aparece en tu listado ni admite cambios. Puedes reactivarla desde Configuración."
              : "Esta finca no está operativa."}
          </p>
        </div>
      )}

      <div className="overview-grid">
        <Card icon="users" title="Tu acceso">
          <dl className="overview-facts">
            <div>
              <dt>Tu rol</dt>
              <dd>{roleText}</dd>
            </div>
            <div>
              <dt>Estado de la finca</dt>
              <dd>{farm.is_active ? "Activa" : "Desactivada"}</dd>
            </div>
          </dl>
        </Card>
        {showMembers ? (
          <MembersCard load={members} onOpen={() => onOpenTab("integrantes")} />
        ) : null}
        {showInvitations ? (
          <InvitationsCard load={invitations} onOpen={() => onOpenTab("invitaciones")} />
        ) : null}
      </div>

      {showHistory ? (
        <ActivityCard load={history} onOpen={() => onOpenTab("historial")} />
      ) : null}
    </div>
  );
}

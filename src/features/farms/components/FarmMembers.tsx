/**
 * Listado de integrantes de una finca.
 *
 * Propósito: consultar miembros (solo administrador) con búsqueda, filtros y
 * paginación, y abrir el detalle. Reutiliza el diseño de Roles y permisos /
 * Administradores (config-crew / config-person).
 * Contexto: pestaña Integrantes del detalle de finca.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { listFarmMembers } from "../services/farmsApi.ts";
import { totalPages } from "../services/eventDescription.ts";
import {
  applyTransfer,
  reloadMembersPage,
  type MemberAdminApi,
} from "../services/memberAdmin.ts";
import type { MemberDetailApi } from "../services/memberDetail.ts";
import { findMember, replaceMember } from "../services/memberSelection.ts";
import { membershipStatusLabel } from "../services/membershipStatusLabel.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type {
  FarmMember,
  FarmMembersResponse,
  FarmRole,
  TransferAdminResponse,
} from "../types/index.ts";
import { initials } from "./FarmOverview.tsx";
import { FarmMemberDetail } from "./FarmMemberDetail.tsx";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "Activa" },
  { value: "revoked", label: "Revocada" },
  { value: "left", label: "Abandonada" },
  { value: "all", label: "Todos" },
];

type Props = {
  farmId: number;
  autoOpen?: boolean;
  listMembers?: typeof listFarmMembers;
  detailApi?: MemberDetailApi;
  initialData?: FarmMembersResponse;
  initialSelectedId?: number;
  changeRole?: (farmId: number, membershipId: number, role: FarmRole) => Promise<FarmMember>;
  onRoleChanged?: (member: FarmMember) => void | Promise<void>;
  canManage?: boolean;
  adminApi?: MemberAdminApi;
  onMemberRevoked?: (member: FarmMember) => void | Promise<void>;
  onAdminTransferred?: (result: TransferAdminResponse) => void | Promise<void>;
  onAccessStale?: () => void;
};

/**
 * Sección de integrantes con el mismo lenguaje visual que Configuración.
 */
export function FarmMembers({
  farmId,
  autoOpen = false,
  listMembers = listFarmMembers,
  detailApi,
  initialData,
  initialSelectedId,
  changeRole,
  onRoleChanged,
  canManage = false,
  adminApi,
  onMemberRevoked,
  onAdminTransferred,
  onAccessStale,
}: Readonly<Props>) {
  const [expanded, setExpanded] = useState(autoOpen);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<FarmMembersResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<FarmMember | null>(() =>
    initialSelectedId === undefined ? null : findMember(initialData, initialSelectedId),
  );
  const requestSeq = useRef(0);
  const rowRefs = useRef(new Map<number, HTMLButtonElement>());
  const returnFocusId = useRef<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(targetPage: number, targetStatus: string, targetQuery: string) {
    const requestId = ++requestSeq.current;
    setLoading(true);
    setError("");
    try {
      const result = await listMembers(
        farmId,
        targetStatus,
        targetQuery,
        targetPage,
        PAGE_SIZE,
      );
      if (requestId !== requestSeq.current) return;
      setData(result);
      setPage(targetPage);
    } catch (cause) {
      if (requestId !== requestSeq.current) return;
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el listado");
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (autoOpen && initialData === undefined) void load(1, "active", "");
  }, [autoOpen, farmId]);

  useEffect(() => {
    if (!expanded) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void load(1, status, query);
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  useEffect(() => {
    if (selected !== null || returnFocusId.current === null) return;
    rowRefs.current.get(returnFocusId.current)?.focus();
    returnFocusId.current = null;
  }, [selected]);

  function toggle() {
    if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
      if (data === null) void load(1, status, query);
    }
  }

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    void load(1, nextStatus, query);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    void load(1, status, query);
  }

  function openMember(membershipId: number) {
    const member = findMember(data, membershipId);
    if (member) setSelected(member);
  }

  async function memberChanged(updated: FarmMember) {
    setData((current) => replaceMember(current, updated));
    setSelected(updated);
    await onRoleChanged?.(updated);
  }

  async function memberRevoked(revoked: FarmMember) {
    returnFocusId.current = null;
    setSelected(null);
    const requestId = ++requestSeq.current;
    setLoading(true);
    setError("");
    try {
      const fresh = await reloadMembersPage(
        listMembers,
        farmId,
        { page, status, query },
        PAGE_SIZE,
      );
      if (requestId === requestSeq.current) {
        setData(fresh.data);
        setPage(fresh.page);
      }
    } catch (cause) {
      if (requestId === requestSeq.current) {
        setError(cause instanceof Error ? cause.message : "No se pudo cargar el listado");
      }
    } finally {
      if (requestId === requestSeq.current) setLoading(false);
    }
    await onMemberRevoked?.(revoked);
  }

  async function adminTransferred(result: TransferAdminResponse) {
    setData((current) => applyTransfer(current, result));
    setSelected(result.new_admin);
    await onAdminTransferred?.(result);
  }

  function closeMember() {
    returnFocusId.current = selected?.id ?? null;
    setSelected(null);
  }

  if (selected) {
    return (
      <section className="farm-members" aria-label="Integrantes de la finca">
        <FarmMemberDetail
          key={selected.id}
          farmId={farmId}
          member={selected}
          onBack={closeMember}
          api={detailApi}
          changeRole={changeRole}
          onRoleChanged={memberChanged}
          canManage={canManage}
          adminApi={adminApi}
          onRevoked={memberRevoked}
          onTransferred={adminTransferred}
          onAccessStale={onAccessStale}
        />
      </section>
    );
  }

  const pages = data ? totalPages(data.count, PAGE_SIZE) : 0;

  return (
    <section className="farm-members config-crew" aria-label="Integrantes de la finca">
      {autoOpen ? null : (
        <button type="button" className="btn-secondary" aria-expanded={expanded} onClick={toggle}>
          {expanded ? "Ocultar integrantes" : "Ver integrantes"}
        </button>
      )}

      {expanded ? (
        <>
          {canManage ? (
            <p className="farm-members__lead">
              Abre un integrante para cambiar su rol, transferirle la administración o
              revocar su acceso.
            </p>
          ) : null}

          <div className="config-crew__toolbar">
            <form className="config-crew__search" onSubmit={submitSearch} noValidate>
              Buscar persona
              <input
                type="search"
                name="q"
                placeholder="Nombre, documento o correo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button type="submit" className="visually-hidden">
                Buscar
              </button>
            </form>
            <div className="farm-roles farm-members__filters" role="group" aria-label="Filtro de estado">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className="farm-roles__option"
                  aria-pressed={filter.value === status}
                  onClick={() => changeStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="farm-state" role="status">
              Cargando integrantes...
            </p>
          ) : null}

          {!loading && error ? (
            <div className="farm-state" role="alert">
              <p>{error}</p>
              <button type="button" className="btn-primary" onClick={() => void load(page, status, query)}>
                Reintentar
              </button>
            </div>
          ) : null}

          {!loading && !error && data && data.results.length === 0 ? (
            <div className="config-empty">
              <h2>{query.trim() ? "Nadie coincide" : "Sin integrantes"}</h2>
              <p>
                {query.trim()
                  ? "Prueba con otro nombre, documento o correo."
                  : "No hay integrantes con ese filtro."}
              </p>
            </div>
          ) : null}

          {!loading && !error && data && data.results.length > 0 ? (
            <ul className="config-crew__grid">
              {data.results.map((member) => {
                const label = member.name || "Integrante sin nombre";
                const active = member.status === "active";
                return (
                  <li key={member.id}>
                    <article className="config-person">
                      <header className="config-person__head">
                        <span className="config-person__avatar" aria-hidden="true">
                          {initials(label)}
                        </span>
                        <div className="config-person__who">
                          <h3>{label}</h3>
                          <p>Integrante de la finca</p>
                        </div>
                        <span className={active ? "config-status is-on" : "config-status is-off"}>
                          {membershipStatusLabel(member.status)}
                        </span>
                      </header>
                      <dl className="config-person__facts">
                        <div>
                          <dt>Rol</dt>
                          <dd>{roleLabel(member.role)}</dd>
                        </div>
                        <div>
                          <dt>Estado</dt>
                          <dd>{membershipStatusLabel(member.status)}</dd>
                        </div>
                      </dl>
                      <div className="config-person__actions">
                        <button
                          type="button"
                          className="btn-primary"
                          data-membership-id={member.id}
                          ref={(node) => {
                            if (node) rowRefs.current.set(member.id, node);
                            else rowRefs.current.delete(member.id);
                          }}
                          onClick={() => openMember(member.id)}
                        >
                          Ver detalle
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!loading && !error && data && data.results.length > 0 ? (
            <div className="farm-members__pagination">
              <button
                type="button"
                className="btn-secondary"
                disabled={!data.previous}
                onClick={() => void load(page - 1, status, query)}
              >
                Anterior
              </button>
              <span className="farm-members__page">
                Página {page} de {pages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={!data.next}
                onClick={() => void load(page + 1, status, query)}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

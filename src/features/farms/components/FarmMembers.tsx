/**
 * Listado de integrantes de una finca.
 *
 * Propósito: consultar miembros (solo administrador) con búsqueda, filtros y
 * paginación de servidor, y abrir el detalle de un integrante. La autorización
 * real la aplica el backend.
 * Contexto: sección independiente del detalle de finca. La selección se hace
 * por id de membresía, nunca por nombre; al volver se conservan filtros,
 * búsqueda y página sin repetir la consulta. Tras revocar (F8) la página se
 * vuelve a pedir al backend; tras transferir se usan las dos membresías que
 * devolvió el backend.
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
  /** Abre y carga la sección al montarse, sin botón de despliegue (uso en pestaña). */
  autoOpen?: boolean;
  /** Consulta del listado (inyectable en pruebas). */
  listMembers?: typeof listFarmMembers;
  /** Operaciones del detalle (inyectables en pruebas). */
  detailApi?: MemberDetailApi;
  /** Página inicial ya cargada (pruebas de renderizado). */
  initialData?: FarmMembersResponse;
  /** Integrante abierto al montar (pruebas de renderizado). */
  initialSelectedId?: number;
  /** PATCH de rol (inyectable en pruebas). */
  changeRole?: (farmId: number, membershipId: number, role: FarmRole) => Promise<FarmMember>;
  /** Se llama tras un cambio de rol exitoso con la membresía devuelta. */
  onRoleChanged?: (member: FarmMember) => void | Promise<void>;
  /** La finca concede can_manage_members: se ofrecen revocar y transferir. */
  canManage?: boolean;
  /** Revocación y transferencia (inyectables en pruebas). */
  adminApi?: MemberAdminApi;
  /** Tras una revocación confirmada por el backend. */
  onMemberRevoked?: (member: FarmMember) => void | Promise<void>;
  /** Tras una transferencia confirmada por el backend. */
  onAdminTransferred?: (result: TransferAdminResponse) => void | Promise<void>;
  /** El backend negó un permiso: hay que releer el acceso a la finca. */
  onAccessStale?: () => void;
};

/**
 * Sección de integrantes con carga bajo demanda, búsqueda, filtros, paginación
 * y detalle del integrante seleccionado.
 * @param props - Identificador de la finca.
 * @returns Sección de integrantes.
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
      setError(
        cause instanceof Error ? cause.message : "No se pudo cargar el listado",
      );
    } finally {
      if (requestId === requestSeq.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (autoOpen && initialData === undefined) void load(1, "active", "");
    // Solo al montar o al cambiar de finca; los filtros recargan por su cuenta.
  }, [autoOpen, farmId]);

  // Al volver del detalle, el foco regresa a la fila del integrante abierto.
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
      if (data === null) {
        void load(1, status, query);
      }
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

  /** Refleja en la página cargada la membresía devuelta por el PATCH. */
  async function memberChanged(updated: FarmMember) {
    setData((current) => replaceMember(current, updated));
    setSelected(updated);
    await onRoleChanged?.(updated);
  }

  /**
   * El backend confirmó la revocación (204): se cierra el detalle y se vuelve
   * a pedir la página con los mismos filtros, sin retirar filas por cuenta propia.
   */
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

  /** Refleja los dos roles que devolvió la transferencia. */
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
    <section className="farm-members" aria-label="Integrantes de la finca">
      {autoOpen ? null : (
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={expanded}
          onClick={toggle}
        >
          {expanded ? "Ocultar integrantes" : "Ver integrantes"}
        </button>
      )}

      {expanded ? (
        <>
          <h3 className="farm-form__title">Integrantes</h3>
          {canManage ? (
            <p className="farm-empty__hint">
              Abre un integrante para cambiar su rol, transferirle la administración o
              revocar su acceso.
            </p>
          ) : null}

          <form className="farm-members__toolbar" onSubmit={submitSearch} noValidate>
            <label className="farm-search">
              <span className="visually-hidden">Buscar integrante</span>
              <input
                type="search"
                name="q"
                placeholder="Buscar por nombre..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary">
              Buscar
            </button>
          </form>

          <div className="farm-members__filters" role="group" aria-label="Filtro de estado">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  filter.value === status
                    ? "farm-members__filter is-active"
                    : "farm-members__filter"
                }
                aria-pressed={filter.value === status}
                onClick={() => changeStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="farm-state" role="status">
              Cargando integrantes...
            </p>
          ) : null}

          {!loading && error ? (
            <div className="farm-state" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void load(page, status, query)}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {!loading && !error && data && data.results.length === 0 ? (
            <p className="farm-state" role="status">
              No hay integrantes que coincidan.
            </p>
          ) : null}

          {!loading && !error && data && data.results.length > 0 ? (
            <ul className="farm-members__list">
              {data.results.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    className="farm-members__item farm-members__row"
                    data-membership-id={member.id}
                    ref={(node) => {
                      if (node) rowRefs.current.set(member.id, node);
                      else rowRefs.current.delete(member.id);
                    }}
                    onClick={() => openMember(member.id)}
                  >
                    <span className="farm-members__name">
                      {member.name || "Integrante sin nombre"}
                    </span>
                    <span className="farm-members__meta">
                      {roleLabel(member.role)}
                      <span className={`farm-member-status is-${member.status}`}>
                        {membershipStatusLabel(member.status)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
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

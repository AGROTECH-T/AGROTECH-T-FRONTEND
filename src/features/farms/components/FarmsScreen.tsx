/**
 * Pantalla de fincas.
 *
 * Propósito: listar, crear y consultar las fincas de la cuenta, y unirse a
 * otra finca con un código de invitación (F10.3.5).
 * Contexto: GET /farms/ solo devuelve fincas activas. «Unirme a una finca»
 * está siempre disponible: una cuenta puede pertenecer a varias fincas con
 * roles distintos, también si ya administra otras.
 * Distribución: banner superior con el título, el total y las acciones
 * («Nueva finca», «Unirme a una finca»); debajo, el selector de rol, el
 * buscador y la cuadrícula de tarjetas. Desde el detalle se abre inventario
 * o galpón de esa finca.
 * @author Cristian Deysdayr Jimenez
 */

import fincaIcon from "../../../assets/icons/finca.png";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { InvitationCodeForm } from "../../invitations/components/InvitationCodeForm.tsx";
import { joinedMessage, type CodeApi } from "../../invitations/services/codeFlow.ts";
import { JOIN_FARM_INTRO, JOIN_FARM_LABEL } from "../services/joinFarm.ts";
import { filterFarms, ROLE_FILTERS, roleCounts, type RoleFilter } from "../services/farmFilter.ts";
import { roleLabel } from "../services/roleLabel.ts";
import {
  applyFarmToList,
  openByIdErrorMessage,
  removeFarmFromList,
} from "../services/farmLifecycle.ts";
import { getFarm, listFarms } from "../services/farmsApi.ts";
import type { Account } from "../../auth/types/index.ts";
import type { Farm } from "../types/index.ts";
import { FarmCreateForm } from "./FarmCreateForm.tsx";
import { FarmDetail } from "./FarmDetail.tsx";
import { FarmList } from "./FarmList.tsx";

type Props = {
  /** Finca que se abre una sola vez al montar (p. ej. tras aceptar una invitación). */
  initialFarmId?: number;
  /** Capacidades globales de la cuenta (GET /auth/me, F6). */
  account?: Pick<Account, "can_create_farms" | "can_create_first_farm" | "can_open_inactive_farms">;
  /** Llamadas de preview y accept por código (inyectables en pruebas). */
  codeApi?: CodeApi;
  /**
   * INT-02: vista elegida desde el menú lateral ("Mis fincas" / "Crear finca").
   * Sin estas props la pantalla maneja la vista por sí misma.
   */
  view?: "lista" | "crear";
  /** Cambia en cada clic del menú: vuelve al listado aunque la vista sea la misma. */
  tick?: number;
  onView?: (view: "lista" | "crear") => void;
  /** Salir del formulario de creación (el menú decide a dónde volver). */
  onLeaveCreate?: () => void;
  /** Abrir inventario de la finca abierta (opcionalmente uno concreto). */
  onOpenInventory?: (farmId: number, inventoryId?: string) => void;
  /** Abrir galpón de la finca abierta (opcionalmente uno concreto). */
  onOpenGalpon?: (farmId: number, houseId?: number) => void;
};

/**
 * Indica si se muestra "Nueva finca".
 * Sin el campo (backend anterior a F6, donde crear era libre) se conserva el
 * comportamiento previo. El backend rechaza igualmente lo no autorizado.
 */
export function farmScreenActions(
  account?: Pick<Account, "can_create_farms" | "can_create_first_farm" | "can_open_inactive_farms">,
): { canCreate: boolean; canOpenById: boolean } {
  // F10.2: también puede crear quien conserva la excepción de primera finca.
  const firstFarm = account?.can_create_first_farm === true;
  return {
    canCreate: firstFarm || (account?.can_create_farms ?? true),
    // Se conserva por compatibilidad de tests; la UI ya no ofrece abrir por id.
    canOpenById: account?.can_open_inactive_farms ?? true,
  };
}

/** @returns Ayuda del estado vacío según haya fincas y la capacidad de crear. */
export function emptyHint(noFarms: boolean, canCreate: boolean): string {
  if (!noFarms) return "Prueba con otro nombre en el buscador.";
  if (canCreate) return `Crea la primera con el botón Nueva finca o usa «${JOIN_FARM_LABEL}».`;
  return `Cuando un administrador te invite a una finca, usa «${JOIN_FARM_LABEL}» con tu código.`;
}

/**
 * Orquesta listado, alta y detalle.
 * @returns Panel de Fincas.
 */
export function FarmsScreen({
  initialFarmId,
  account,
  codeApi,
  view,
  tick = 0,
  onView,
  onLeaveCreate,
  onOpenInventory,
  onOpenGalpon,
}: Readonly<Props>) {
  const actions = farmScreenActions(account);
  const canCreate = actions.canCreate;
  const [farms, setFarms] = useState<Farm[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("todas");
  const [selected, setSelected] = useState<Farm | null>(null);
  const [creatingLocal, setCreatingLocal] = useState(false);
  // INT-02: con menú, "crear" lo decide la vista recibida; sin menú, el estado local.
  const creating = view === undefined ? creatingLocal : view === "crear";
  const keepSelection = useRef(false);
  const setCreating = (next: boolean) => {
    if (view === undefined || !onView) {
      setCreatingLocal(next);
      return;
    }
    if (next) onView("crear");
    else (onLeaveCreate ?? (() => onView("lista")))();
  };
  const [joining, setJoining] = useState(false);
  // Cambia en cada apertura: el formulario empieza vacío y sin estado previo.
  const [joinSession, setJoinSession] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const notices = useNotices();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFarms(await listFarms());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // INT-02: cada clic del menú vuelve al listado, salvo justo tras crear una finca.
  useEffect(() => {
    if (view === undefined) return;
    if (keepSelection.current) {
      keepSelection.current = false;
      return;
    }
    setSelected(null);
  }, [view, tick]);

  const openedInitial = useRef(false);
  useEffect(() => {
    if (initialFarmId === undefined || openedInitial.current) return;
    openedInitial.current = true;
    getFarm(initialFarmId)
      .then(setSelected)
      .catch((cause: unknown) => notices.push([openByIdErrorMessage(cause)], "warn"));
  }, [initialFarmId]);

  const filtered = useMemo(() => filterFarms(farms, role, query), [farms, role, query]);
  const counts = useMemo(() => roleCounts(farms), [farms]);

  const openJoinedFarm = (farmId: number) => {
    // La membresía nueva aparece en el listado; se relee y se abre la finca.
    void load();
    getFarm(farmId)
      .then(setSelected)
      .catch((cause: unknown) => notices.push([openByIdErrorMessage(cause)], "warn"));
  };

  const noticeStack = <NoticeStack items={notices.items} onClose={notices.close} />;

  if (selected) {
    return (
      <section className="panel" aria-label="Detalle de finca">
        <FarmDetail
          farm={selected}
          onBack={() => setSelected(null)}
          onUpdated={(farm) => {
            if (selected.is_active !== farm.is_active) {
              notices.push(
                [farm.is_active ? "Finca reactivada." : "Finca desactivada."],
                "ok",
              );
            }
            setFarms((current) => applyFarmToList(current, farm));
            setSelected(farm);
          }}
          onLeft={(farmId) => {
            notices.push(["Abandonaste la finca."], "ok");
            setFarms((current) => removeFarmFromList(current, farmId));
            setSelected(null);
          }}
          onNotice={(text, tone) => notices.push([text], tone)}
          onOpenInventory={
            onOpenInventory
              ? (inventoryId) => onOpenInventory(selected.id, inventoryId)
              : undefined
          }
          onOpenGalpon={
            onOpenGalpon ? (houseId) => onOpenGalpon(selected.id, houseId) : undefined
          }
        />
        {noticeStack}
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="farms-title">
      <header className="farm-hero">
        <div className="farm-hero__text">
          <div className="farm-hero__title">
            <h1 id="farms-title" className="panel__title">
              Fincas
            </h1>
            {!loading && !error ? (
              <span className="farm-hero__count">
                {farms.length === 1 ? "1 finca" : `${farms.length} fincas`}
              </span>
            ) : null}
          </div>
          <p className="panel__lead">Tus fincas y el rol que tienes en cada una.</p>
          <div className="farm-hero__actions">
            {canCreate ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCreating(true)}
                disabled={creating}
              >
                + Nueva finca
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              data-action="join-farm"
              aria-haspopup="dialog"
              aria-expanded={joining}
              onClick={() => {
                if (!joining) setJoinSession((value) => value + 1);
                setJoining(true);
              }}
            >
              {JOIN_FARM_LABEL}
            </button>
          </div>
        </div>
        <span className="farm-hero__art" aria-hidden="true">
          <img src={fincaIcon} alt="" width={40} height={40} decoding="async" />
        </span>
      </header>

      <div className="farm-toolbar">
        {farms.length > 0 ? (
          <div className="farm-roles" role="group" aria-label="Filtrar por rol">
            {ROLE_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                className="farm-roles__option"
                data-role={option}
                aria-pressed={role === option}
                onClick={() => setRole(option)}
              >
                {option === "todas" ? "Todas" : roleLabel(option)}
                <span className="farm-roles__count">{counts[option]}</span>
              </button>
            ))}
          </div>
        ) : null}
        <label className="farm-search">
          <span className="visually-hidden">Buscar finca</span>
          <input
            type="search"
            name="q"
            placeholder="Buscar finca..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {joining ? (
        <InvitationCodeForm
          key={joinSession}
          inWindow
          title={JOIN_FARM_LABEL}
          intro={JOIN_FARM_INTRO}
          api={codeApi}
          onCancel={() => setJoining(false)}
          onAccepted={(result, preview) => {
            setJoining(false);
            notices.push([joinedMessage(preview, result)], "ok");
            openJoinedFarm(result.farm_id);
          }}
        />
      ) : null}

      {creating && canCreate ? (
        <FarmCreateForm
          inWindow
          onCancel={() => setCreating(false)}
          onCreated={(farm) => {
            notices.push(["Finca creada."], "ok");
            setFarms((current) => [...current, farm].sort((a, b) => a.id - b.id));
            keepSelection.current = true;
            if (view === undefined || !onView) setCreating(false);
            else onView("lista");
            setSelected(farm);
          }}
        />
      ) : null}

      {loading ? (
        <p className="farm-state" role="status">
          Cargando fincas...
        </p>
      ) : null}

      {!loading && error ? (
        <div className="farm-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="farm-empty" role="status">
          <p className="farm-empty__title">
            {farms.length === 0 ? "Aún no tienes fincas" : "No hay coincidencias"}
          </p>
          <p className="farm-empty__hint">
            {emptyHint(farms.length === 0, canCreate)}
          </p>
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <FarmList farms={filtered} onSelect={setSelected} />
      ) : null}
      {noticeStack}
    </section>
  );
}

/**
 * Pantalla de fincas.
 *
 * Propósito: listar, crear y consultar las fincas de la cuenta, abrir por
 * identificador una finca que no aparece en el listado (p. ej. desactivada) y
 * unirse a otra finca con un código de invitación (F10.3.5).
 * Contexto: GET /farms/ solo devuelve fincas activas; el administrador puede
 * consultar una finca desactivada con GET /farms/{id}/. «Unirme a una finca»
 * está siempre disponible: una cuenta puede pertenecer a varias fincas con
 * roles distintos, también si ya administra otras.
 * Distribución: banner superior con el título, el total y las acciones
 * («Nueva finca», «Unirme a una finca» y «Abrir por identificador»); debajo,
 * el selector de rol, el buscador y la cuadrícula de tarjetas.
 * @author Cristian Deysdayr Jimenez
 */

import fincaArt from "../../../assets/onboard-finca.webp";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { InvitationCodeForm } from "../../invitations/components/InvitationCodeForm.tsx";
import { joinedMessage, type CodeApi } from "../../invitations/services/codeFlow.ts";
import { JOIN_FARM_INTRO, JOIN_FARM_LABEL } from "../services/joinFarm.ts";
import { filterFarms, ROLE_FILTERS, roleCounts, type RoleFilter } from "../services/farmFilter.ts";
import { roleLabel } from "../services/roleLabel.ts";
import {
  applyFarmToList,
  openByIdErrorMessage,
  parseFarmId,
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
};

/**
 * Indica si se muestran "Nueva finca" y "Abrir por identificador".
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
export function FarmsScreen({ initialFarmId, account, codeApi }: Readonly<Props>) {
  const actions = farmScreenActions(account);
  const canCreate = actions.canCreate;
  const [farms, setFarms] = useState<Farm[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("todas");
  const [selected, setSelected] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  // Cambia en cada apertura: el formulario empieza vacío y sin estado previo.
  const [joinSession, setJoinSession] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupPending, setLookupPending] = useState(false);
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

  const openedInitial = useRef(false);
  useEffect(() => {
    if (initialFarmId === undefined || openedInitial.current) return;
    openedInitial.current = true;
    getFarm(initialFarmId)
      .then(setSelected)
      .catch((cause: unknown) => notices.push([openByIdErrorMessage(cause)], "warn"));
  }, [initialFarmId]);

  // Una finca recién creada convierte a la cuenta en administradora sin
  // recargar /auth/me; el listado actual también habilita la consulta por id.
  const canOpenById =
    actions.canOpenById || farms.some((farm) => farm.role === "administrador");

  const filtered = useMemo(() => filterFarms(farms, role, query), [farms, role, query]);
  const counts = useMemo(() => roleCounts(farms), [farms]);

  async function openById(event: FormEvent) {
    event.preventDefault();
    const farmId = parseFarmId(lookupId);
    if (farmId === null) {
      setLookupError("Escribe un identificador numérico válido.");
      return;
    }
    setLookupPending(true);
    setLookupError("");
    try {
      const farm = await getFarm(farmId);
      setLookupOpen(false);
      setLookupId("");
      setSelected(farm);
    } catch (cause) {
      setLookupError(openByIdErrorMessage(cause));
    } finally {
      setLookupPending(false);
    }
  }

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
              className={canCreate ? "btn-secondary" : "btn-primary"}
              data-action="join-farm"
              aria-expanded={joining}
              onClick={() => {
                if (!joining) setJoinSession((value) => value + 1);
                setJoining((open) => !open);
              }}
            >
              {JOIN_FARM_LABEL}
            </button>
          </div>
          {canOpenById ? (
            <button
              type="button"
              className="text-link farm-hero__lookup"
              aria-expanded={lookupOpen}
              onClick={() => {
                setLookupOpen((open) => !open);
                setLookupError("");
              }}
            >
              Abrir por identificador
            </button>
          ) : null}
        </div>
        <span className="farm-hero__art" aria-hidden="true">
          <img src={fincaArt} alt="" width={48} height={48} decoding="async" />
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

      {lookupOpen && canOpenById ? (
        <form className="farm-form" onSubmit={(event) => void openById(event)} noValidate>
          <h2 className="farm-form__title">Abrir finca por identificador</h2>
          <p className="farm-empty__hint">
            Las fincas desactivadas no aparecen en el listado. Si eres su administrador
            puedes abrirlas con su identificador para consultarlas o reactivarlas.
          </p>
          <label className="farm-form__field">
            <span>Identificador</span>
            <input
              type="text"
              inputMode="numeric"
              name="farm-id"
              placeholder="Ejemplo: 2"
              value={lookupId}
              autoComplete="off"
              disabled={lookupPending}
              onChange={(event) => {
                setLookupId(event.target.value);
                setLookupError("");
              }}
            />
          </label>
          {lookupError ? (
            <p className="farm-form__error" role="alert">
              {lookupError}
            </p>
          ) : null}
          <div className="farm-form__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLookupOpen(false)}
              disabled={lookupPending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={lookupPending}>
              {lookupPending ? "Abriendo..." : "Abrir finca"}
            </button>
          </div>
        </form>
      ) : null}

      {joining ? (
        <InvitationCodeForm
          key={joinSession}
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
          onCancel={() => setCreating(false)}
          onCreated={(farm) => {
            setFarms((current) => [...current, farm].sort((a, b) => a.id - b.id));
            setCreating(false);
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

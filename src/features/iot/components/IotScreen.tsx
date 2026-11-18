import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ApiError } from "../../../services/api/client.ts";
import { listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm } from "../../farms/types/index.ts";
import {
  IotRequestGuard,
  listAllIot,
  listIot,
  type IotCoordinator,
  type IotDevice,
  type IotPage,
  type IotReading,
  type IotResource,
  type IotSensor,
} from "../services/iotApi.ts";
import {
  adjustedOriginalText,
  initialIotQuery,
  iotQueryReducer,
  iotRequestPlan,
  READING_STATUS_LABEL,
  readingStatus,
  readingValueText,
  selectedFarmAfterAccessRefresh,
  type IotQuery,
  type IotView,
} from "../services/iotState.ts";
import { formatIotDate, formatIotTime } from "./iotFormat.ts";
import { IotLatestReadings } from "./IotLatestReadings.tsx";
import { IotTrend } from "./IotTrend.tsx";
import "../styles/iot.css";

const views: IotView[] = ["Resumen", "Gateways", "Coordinators", "Sensores", "Historial"];

export function iotErrorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.isUnauthorized) return "Tu sesión terminó. Vuelve a iniciar sesión.";
    if (cause.isForbidden) return "No tienes permiso para consultar este recurso.";
    return cause.message;
  }
  if (cause instanceof RangeError) return cause.message;
  if (cause instanceof Error && cause.name === "TypeError") {
    return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
  }
  return cause instanceof Error ? cause.message : "No se pudo cargar la información.";
}

/** Most recent `server_received_at` in a list of readings, or null. */
export function latestReceivedAt(readings: readonly IotReading[]): string | null {
  let best: string | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const reading of readings) {
    const time = Date.parse(reading.server_received_at);
    if (!Number.isNaN(time) && time > bestTime) {
      bestTime = time;
      best = reading.server_received_at;
    }
  }
  return best;
}

type AccessCheck = "accessible" | "missing" | "stale" | "failed";

function ReadingsTable({ readings }: { readings: readonly IotReading[] }) {
  return <div className="iot-table-wrap"><table className="iot-table">
    <thead><tr><th>Sensor</th><th>Métrica</th><th>Valor efectivo</th><th>Estado</th><th>Medición</th><th>Recepción</th></tr></thead>
    <tbody>{readings.map((row) => {
      const status = readingStatus(row);
      const original = adjustedOriginalText(row);
      return <tr key={row.uid}>
        <td>{row.sensor_uid}</td>
        <td>{row.metric}</td>
        <td><span className={`iot-value iot-value--${status}`}>{readingValueText(row)}</span>{original ? <small className="iot-muted"> (original {original})</small> : null}</td>
        <td><span className={`iot-badge iot-badge--${status}`}>{READING_STATUS_LABEL[status]}</span>{original ? <span className="iot-badge iot-badge--adjusted">Ajustada</span> : null}</td>
        <td>{formatIotDate(row.measured_at)}{row.measured_at_approximate ? " (aproximada)" : ""}</td>
        <td>{formatIotDate(row.server_received_at)}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export function IotScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | null>(null);
  const [farmLoading, setFarmLoading] = useState(true);
  const [farmError, setFarmError] = useState("");
  const [query, dispatch] = useReducer(iotQueryReducer, initialIotQuery);
  const [data, setData] = useState<Partial<Record<IotResource, IotPage>>>({});
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [sensorData, setSensorData] = useState<IotPage<IotSensor> | null>(null);
  const [sensorLoading, setSensorLoading] = useState(false);
  const [sensorError, setSensorError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestGuard = useRef(new IotRequestGuard());
  const sensorGuard = useRef(new IotRequestGuard());
  const farmListGuard = useRef(new IotRequestGuard());
  const accessChecks = useRef(new Map<number, Promise<Farm[]>>());
  const { view, page, sensorUid } = query;

  const loadFarms = useCallback(async () => {
    const request = farmListGuard.current.begin();
    setFarmLoading(true);
    setFarmError("");
    try {
      const available = await listFarms();
      if (!farmListGuard.current.isCurrent(request)) return;
      setFarms(available);
      setFarmId((current) =>
        current !== null && available.some((farm) => farm.id === current)
          ? current
          : available[0]?.id ?? null,
      );
    } catch (cause) {
      if (!farmListGuard.current.isCurrent(request)) return;
      setFarmError(iotErrorText(cause));
      setFarms([]);
      setFarmId(null);
    } finally {
      if (farmListGuard.current.isCurrent(request)) setFarmLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  const refreshAccess = useCallback(async (
    selectedId: number,
    stillCurrent: () => boolean,
  ): Promise<AccessCheck> => {
    let pending = accessChecks.current.get(selectedId);
    if (!pending) {
      pending = listFarms();
      accessChecks.current.set(selectedId, pending);
    }

    let available: Farm[];
    try {
      available = await pending;
    } catch {
      if (accessChecks.current.get(selectedId) === pending) accessChecks.current.delete(selectedId);
      if (!stillCurrent()) return "stale";
      setFarmError("No se pudo verificar el acceso a la finca. Revisa tu conexión e inténtalo de nuevo.");
      return "failed";
    }
    if (accessChecks.current.get(selectedId) === pending) accessChecks.current.delete(selectedId);
    if (!stillCurrent()) return "stale";

    setFarms(available);
    if (selectedFarmAfterAccessRefresh(selectedId, available) !== null) return "accessible";

    requestGuard.current.invalidate();
    sensorGuard.current.invalidate();
    setData({});
    setRefreshedAt(null);
    setSensorData(null);
    setSensorLoading(false);
    dispatch({ type: "farmChanged" });
    setFarmId((current) => (current === selectedId ? null : current));
    setFarmError("Ya no tienes acceso a la finca seleccionada. Se actualizó la lista de fincas disponibles.");
    return "missing";
  }, []);

  useEffect(() => {
    const request = sensorGuard.current.begin();
    setSensorData(null);
    setSensorError("");
    setSensorLoading(farmId !== null && !farmLoading);
    if (farmId === null || farmLoading) return;

    const selectedId = farmId;
    void (async () => {
      try {
        const response = await listAllIot<IotSensor>(selectedId, "sensors");
        if (!sensorGuard.current.isCurrent(request)) return;
        setSensorData(response);
        dispatch({ type: "sensorsLoaded", sensors: response.results });
      } catch (cause) {
        if (!sensorGuard.current.isCurrent(request)) return;
        if (cause instanceof ApiError && cause.isNotFound) {
          const access = await refreshAccess(selectedId, () => sensorGuard.current.isCurrent(request));
          if (access === "missing" || access === "stale") return;
        }
        if (sensorGuard.current.isCurrent(request)) setSensorError(iotErrorText(cause));
      } finally {
        if (sensorGuard.current.isCurrent(request)) setSensorLoading(false);
      }
    })();
  }, [farmId, farmLoading, refreshAccess]);

  /** Loads the data of `target`. It never changes the query, so it cannot reset the page. */
  const load = useCallback(async (target: IotQuery) => {
    const selectedId = farmId;
    if (selectedId === null) return;
    const request = requestGuard.current.begin();
    setLoading(true);
    setError("");

    try {
      // Sensors load apart when the farm changes; the plan for "Sensores" is empty.
      const plan = iotRequestPlan(target.view, target.page, target);
      if (plan.length === 0) return;
      const responses = await Promise.all(plan.map(({ resource, params }) => listIot(selectedId, resource, params)));
      if (!requestGuard.current.isCurrent(request)) return;
      setData((current) => ({
        ...current,
        ...Object.fromEntries(plan.map(({ resource }, index) => [resource, responses[index]])),
      }));
      setRefreshedAt(Date.now());
    } catch (cause) {
      if (!requestGuard.current.isCurrent(request)) return;
      if (cause instanceof ApiError && cause.isNotFound) {
        const access = await refreshAccess(selectedId, () => requestGuard.current.isCurrent(request));
        if (access === "missing" || access === "stale") return;
        if (access === "failed") {
          setError("No se pudo comprobar si conservas acceso a esta finca.");
          return;
        }
        if (target.view === "Historial" && target.sensorUid) {
          setError("El sensor seleccionado no está disponible en esta finca.");
          return;
        }
      }
      setError(iotErrorText(cause));
    } finally {
      if (requestGuard.current.isCurrent(request)) setLoading(false);
    }
  }, [farmId, refreshAccess]);

  // Reacts to query changes (including page) by loading; it must not write the query.
  useEffect(() => {
    requestGuard.current.invalidate();
    setData({});
    setError("");
    if (farmId !== null && !farmLoading) void load(query);
    else setLoading(false);
  }, [farmId, farmLoading, load, query]);

  const readings = (data.readings?.results ?? []) as IotReading[];
  const selectedFarm = farms.find((farm) => farm.id === farmId);
  const selectedSensor = sensorData?.results.find((sensor) => sensor.uid === sensorUid);
  const lastReceived = latestReceivedAt(readings);
  const current = view === "Gateways"
    ? data.gateways
    : view === "Coordinators"
      ? data.coordinators
      : view === "Historial"
        ? data.readings
        : null;
  const refreshing = loading || (view === "Sensores" && sensorLoading);
  const hasData = view === "Resumen" ? Boolean(data.readings) : view === "Sensores" ? Boolean(sensorData) : Boolean(current);

  const devicesTable = (rows: readonly (IotDevice | IotCoordinator)[]) =>
    <div className="iot-table-wrap"><table className="iot-table"><thead><tr><th>UID</th><th>Nombre</th><th>Ubicación</th><th>Registro</th><th>Creado</th><th>Actualizado</th></tr></thead><tbody>{rows.map((row) => <tr key={row.uid}><td>{row.uid}</td><td>{row.name || "—"}</td><td>{row.location_label || "—"}</td><td>{row.is_active ? "Activo" : "Inactivo"}</td><td>{formatIotDate(row.created_at)}</td><td>{formatIotDate(row.updated_at)}</td></tr>)}</tbody></table></div>;

  const sensorsTable = (rows: readonly IotSensor[]) =>
    <div className="iot-table-wrap"><table className="iot-table"><thead><tr><th>UID</th><th>Canal</th><th>Métrica</th><th>Unidad</th><th>Registro</th><th>Coordinator UID</th><th>Fuente</th></tr></thead><tbody>{rows.map((row) => <tr key={row.uid}><td>{row.uid}</td><td>{row.channel}</td><td>{row.metric}</td><td>{row.unit || "—"}</td><td>{row.is_active ? "Activo" : "Inactivo"}</td><td>{row.coordinator_uid}</td><td>{row.source ? row.source.name : "—"}</td></tr>)}</tbody></table></div>;

  const body = () => {
    if (view === "Sensores") {
      if (sensorError) return <div className="iot-message iot-error" role="alert"><strong>No se pudieron cargar los sensores</strong><p>{sensorError}</p></div>;
      if (sensorLoading || !sensorData) return <div className="iot-message" role="status">Cargando sensores…</div>;
      return sensorData.results.length
        ? <>{sensorsTable(sensorData.results)}<div className="iot-pagination"><span>{sensorData.count} registros</span></div></>
        : <div className="iot-message"><strong>Sin sensores</strong><p>Esta finca no tiene sensores registrados.</p></div>;
    }
    if (error) return <div className="iot-message iot-error" role="alert"><strong>No se pudo cargar IoT</strong><p>{error}</p><button onClick={() => void load(query)} disabled={loading}>Reintentar</button></div>;
    if (loading && !hasData) return <div className="iot-message" role="status">Cargando información IoT…</div>;
    if (view === "Resumen") {
      return <>
        <div className="iot-metrics">
          {([["Gateways", data.gateways?.count], ["Coordinators", data.coordinators?.count], ["Sensores", sensorData?.count]] as const).map(([label, value]) =>
            <article className="iot-metric" key={label}><span>{label}</span><strong>{value ?? (sensorLoading ? "…" : "—")}</strong><small>registros en la finca</small></article>)}
          <article className="iot-metric"><span>Última recepción</span><strong className="iot-date-value">{lastReceived ? formatIotDate(lastReceived) : "Sin datos"}</strong><small>hora del servidor, según la muestra</small></article>
        </div>
        {sensorError ? <div className="iot-message iot-error" role="alert"><p>{sensorError}</p></div>
          : sensorData && refreshedAt !== null ? <IotLatestReadings sensors={sensorData.results} readings={readings} refreshedAt={refreshedAt} />
            : <div className="iot-message" role="status">Cargando sensores…</div>}
        <h2>Últimas mediciones</h2>
        {readings.length ? <ReadingsTable readings={readings.slice(0, 20)} /> : <div className="iot-message">No hay mediciones en los últimos días consultados.</div>}
      </>;
    }
    if (!current?.results.length) return <div className="iot-message"><strong>Sin datos para mostrar</strong><p>La API no devolvió registros en esta sección{view === "Historial" ? " con los filtros actuales" : ""}.</p></div>;
    return <>
      {view === "Historial" && selectedSensor ? <IotTrend readings={readings} sensorUid={selectedSensor.uid} unit={selectedSensor.unit} /> : null}
      {view === "Historial" ? <ReadingsTable readings={readings} /> : devicesTable(current.results as IotDevice[])}
      <div className="iot-pagination"><span>{current.count} registros</span><div><button disabled={loading || !current.previous} onClick={() => dispatch({ type: "navigate", direction: -1, loading })}>Anterior</button><span>Página {page}</span><button disabled={loading || !current.next} onClick={() => dispatch({ type: "navigate", direction: 1, loading })}>Siguiente</button></div></div>
    </>;
  };

  return <section className="panel iot-panel" aria-labelledby="iot-title">
    <header className="panel__header iot-header">
      <div><span className="iot-eyebrow">MONITOREO DE CAMPO</span><h1 id="iot-title" className="panel__title">Internet de las cosas</h1><p className="panel__lead">Dispositivos, sensores y lecturas recibidas.</p></div>
      <div className="iot-refresh-box">
        <button className="iot-refresh" onClick={() => void load(query)} disabled={refreshing || farmId === null || view === "Sensores"}>{refreshing ? "Actualizando…" : "Actualizar"}</button>
        <small className="iot-muted" role="status">{refreshing && hasData ? "Actualizando datos…" : refreshedAt !== null ? `Actualizado a las ${formatIotTime(refreshedAt)}` : ""}</small>
      </div>
    </header>
    {farmError ? <div className="iot-message iot-error" role="alert"><p>{farmError}</p><button onClick={() => void loadFarms()}>Reintentar</button></div> : null}
    <div className="iot-farm-picker"><label htmlFor="iot-farm">Finca</label>{farmLoading ? <span role="status">Cargando fincas…</span> : farms.length ? <select id="iot-farm" value={farmId ?? ""} onChange={(event) => { requestGuard.current.invalidate(); sensorGuard.current.invalidate(); setLoading(false); setData({}); setRefreshedAt(null); setSensorData(null); dispatch({ type: "farmChanged" }); setFarmError(""); setFarmId(Number(event.target.value)); }}><option value="" disabled>Selecciona una finca</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select> : !farmError ? <span role="status">No tienes fincas disponibles.</span> : null}{selectedFarm ? <span className="iot-selected-farm">Finca seleccionada: {selectedFarm.name}</span> : null}</div>
    {farmId !== null ? <>
      <nav className="iot-tabs" aria-label="Secciones IoT">{views.map((item) => <button key={item} className={view === item ? "is-active" : ""} aria-current={view === item ? "page" : undefined} onClick={() => dispatch({ type: "view", view: item })}>{item}</button>)}</nav>
      {view === "Historial" ? <div className="iot-filters">
        <label>Sensor<select value={sensorUid} disabled={sensorLoading || loading} onChange={(event) => dispatch({ type: "sensor", sensorUid: event.target.value })}><option value="">Todos</option>{(sensorData?.results ?? []).map((sensor) => <option key={sensor.uid} value={sensor.uid}>{sensor.uid} · {sensor.metric}</option>)}</select>{sensorLoading ? <small role="status">Cargando sensores…</small> : sensorError ? <small role="alert">{sensorError}</small> : sensorData?.count === 0 ? <small role="status">Esta finca no tiene sensores.</small> : null}</label>
        <label>Desde<input type="date" value={query.from} disabled={loading} onChange={(event) => dispatch({ type: "from", value: event.target.value })} /></label>
        <label>Hasta<input type="date" value={query.to} disabled={loading} onChange={(event) => dispatch({ type: "to", value: event.target.value })} /></label>
        <small className="iot-date-help">Las fechas se interpretan en la zona horaria local de tu navegador y se envían con su desfase UTC. Sin fechas, la API devuelve los últimos 7 días. Elige un sensor para ver su tendencia.</small>
      </div> : null}
      {body()}
    </> : null}
  </section>;
}

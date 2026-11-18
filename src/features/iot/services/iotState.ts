import type { IotDecimal, IotReading, IotResource, IotSensor } from "./iotApi.ts";
import { farmIsAccessible, pageParams, readingDateParams } from "./iotApi.ts";

export type IotView = "Resumen" | "Gateways" | "Coordinators" | "Sensores" | "Historial";

/** Rows requested on the summary to derive the latest reading per sensor. */
export const SUMMARY_READING_SAMPLE = 100;
export const LIST_PAGE_SIZE = 20;
/**
 * Window used to *estimate* recent activity from `server_received_at`.
 * It is not a confirmed device connection state: the API does not expose one.
 */
export const RECENT_ACTIVITY_WINDOW_MS = 30 * 60 * 1000;

export function firstHistoryPage(): number {
  return 1;
}

export function historyPageAfterNavigation(
  currentPage: number,
  direction: -1 | 1,
  loading: boolean,
): number {
  if (loading) return currentPage;
  return Math.max(1, currentPage + direction);
}

export function sensorSelectionAfterFarmChange(): string {
  return "";
}

export function sensorSelectionAfterLoad(
  selectedUid: string,
  sensors: readonly IotSensor[],
): string {
  return sensors.some((sensor) => sensor.uid === selectedUid) ? selectedUid : "";
}

export function selectedFarmAfterAccessRefresh(
  selectedId: number,
  farms: readonly { id: number }[],
): number | null {
  return farmIsAccessible(selectedId, farms) ? selectedId : null;
}

export type IotRequest = { resource: IotResource; params: URLSearchParams };
export type HistoryFilters = { sensorUid: string; from: string; to: string };

/**
 * Everything that decides which page of data is requested. Page resets live
 * here, in the transitions that change the query (view, filters, farm), and
 * never in the effect that loads data: an effect that depended on `page` and
 * also reset it sent every "Siguiente" straight back to page 1.
 */
export type IotQuery = HistoryFilters & { view: IotView; page: number };

export type IotQueryAction =
  | { type: "view"; view: IotView }
  | { type: "sensor"; sensorUid: string }
  | { type: "from"; value: string }
  | { type: "to"; value: string }
  | { type: "navigate"; direction: -1 | 1; loading: boolean }
  | { type: "farmChanged" }
  | { type: "sensorsLoaded"; sensors: readonly IotSensor[] };

export const initialIotQuery: IotQuery = { view: "Resumen", page: 1, sensorUid: "", from: "", to: "" };

/** Returns the same object when nothing changes, so effects keyed on it do not re-run. */
export function iotQueryReducer(state: IotQuery, action: IotQueryAction): IotQuery {
  switch (action.type) {
    case "view":
      return action.view === state.view ? state : { ...state, view: action.view, page: firstHistoryPage() };
    case "sensor":
      return action.sensorUid === state.sensorUid ? state : { ...state, sensorUid: action.sensorUid, page: firstHistoryPage() };
    case "from":
      return action.value === state.from ? state : { ...state, from: action.value, page: firstHistoryPage() };
    case "to":
      return action.value === state.to ? state : { ...state, to: action.value, page: firstHistoryPage() };
    case "navigate": {
      const page = historyPageAfterNavigation(state.page, action.direction, action.loading);
      return page === state.page ? state : { ...state, page };
    }
    case "farmChanged": {
      const sensorUid = sensorSelectionAfterFarmChange();
      return sensorUid === state.sensorUid && state.page === firstHistoryPage()
        ? state
        : { ...state, sensorUid, page: firstHistoryPage() };
    }
    case "sensorsLoaded": {
      const sensorUid = sensorSelectionAfterLoad(state.sensorUid, action.sensors);
      return sensorUid === state.sensorUid ? state : { ...state, sensorUid, page: firstHistoryPage() };
    }
  }
}

/** Calendar days covered by the summary sample (backend maximum is 31 elapsed days). */
export const SUMMARY_WINDOW_DAYS = 30;

/** Local `YYYY-MM-DD` that starts the summary window, `SUMMARY_WINDOW_DAYS` before `now`. */
export function summaryFromDate(now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - SUMMARY_WINDOW_DAYS);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

/**
 * Requests needed to render a view. The page passed in is always the page
 * requested, so navigating to page 2 produces `page=2` (sensors load apart).
 */
export function iotRequestPlan(
  view: IotView,
  page: number,
  filters: HistoryFilters,
  now = new Date(),
): IotRequest[] {
  if (view === "Sensores") return [];
  if (view === "Resumen") {
    const readings = pageParams(1, SUMMARY_READING_SAMPLE);
    readings.set("ordering", "-measured_at");
    readingDateParams(readings, summaryFromDate(now), "", now);
    return [
      { resource: "gateways", params: pageParams(1, 1) },
      { resource: "coordinators", params: pageParams(1, 1) },
      { resource: "readings", params: readings },
    ];
  }
  const params = pageParams(page, LIST_PAGE_SIZE);
  if (view === "Historial") {
    params.set("ordering", "-measured_at");
    if (filters.sensorUid) params.set("sensor_uid", filters.sensorUid);
    readingDateParams(params, filters.from, filters.to, now);
    return [{ resource: "readings", params }];
  }
  return [{ resource: view === "Gateways" ? "gateways" : "coordinators", params }];
}

/** Parses a DRF decimal (string or number); returns null when not finite. */
export function parseDecimal(value: IotDecimal | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type ReadingStatus = "valid" | "null" | "invalidated";

/** Validity of a reading according to its latest correction and effective value. */
export function readingStatus(reading: IotReading): ReadingStatus {
  if (reading.latest_correction?.correction_type === "invalidation") return "invalidated";
  return parseDecimal(reading.effective_value) === null ? "null" : "valid";
}

export function readingWasAdjusted(reading: IotReading): boolean {
  return reading.latest_correction?.correction_type === "value_adjustment";
}

export const READING_STATUS_LABEL: Record<ReadingStatus, string> = {
  valid: "Válida",
  null: "Sin valor",
  invalidated: "Invalidada",
};

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/** Text for the effective value; never shows the original value of an invalidated reading. */
export function readingValueText(reading: IotReading): string {
  const status = readingStatus(reading);
  if (status !== "valid") return READING_STATUS_LABEL[status];
  const value = parseDecimal(reading.effective_value) as number;
  return reading.unit ? `${numberFormatter.format(value)} ${reading.unit}` : numberFormatter.format(value);
}

/**
 * Original value of an adjusted reading, for context next to the effective
 * value. Null for unadjusted, invalidated or empty readings.
 */
export function adjustedOriginalText(reading: IotReading): string | null {
  if (!readingWasAdjusted(reading)) return null;
  const original = parseDecimal(reading.original_value ?? reading.value);
  if (original === null) return null;
  return reading.unit ? `${numberFormatter.format(original)} ${reading.unit}` : numberFormatter.format(original);
}

function timeOf(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/** Most recent reading of each sensor (by `measured_at`, then `server_received_at`). */
export function latestReadingsBySensor(readings: readonly IotReading[]): Map<string, IotReading> {
  const latest = new Map<string, IotReading>();
  for (const reading of readings) {
    const current = latest.get(reading.sensor_uid);
    if (
      !current ||
      timeOf(reading.measured_at) > timeOf(current.measured_at) ||
      (timeOf(reading.measured_at) === timeOf(current.measured_at) &&
        timeOf(reading.server_received_at) > timeOf(current.server_received_at))
    ) {
      latest.set(reading.sensor_uid, reading);
    }
  }
  return latest;
}

export type ActivityEstimate = "recent" | "stale" | "unknown";

export const ACTIVITY_ESTIMATE_LABEL: Record<ActivityEstimate, string> = {
  recent: "Actividad reciente (estimada)",
  stale: "Sin recepciones recientes (estimado)",
  unknown: "Actividad desconocida",
};

/**
 * Estimates recent activity from the server reception time relative to the
 * moment data was refreshed. This is an estimate, not a device state.
 */
export function activityEstimate(
  serverReceivedAt: string | null | undefined,
  reference: number,
  windowMs = RECENT_ACTIVITY_WINDOW_MS,
): ActivityEstimate {
  if (!serverReceivedAt) return "unknown";
  const received = Date.parse(serverReceivedAt);
  if (Number.isNaN(received) || !Number.isFinite(reference)) return "unknown";
  return reference - received <= windowMs ? "recent" : "stale";
}

export type TrendPoint = { time: number; value: number };

/** Valid effective values of one sensor, oldest first, ready to plot. */
export function trendSeries(readings: readonly IotReading[], sensorUid: string): TrendPoint[] {
  return readings
    .filter((reading) => reading.sensor_uid === sensorUid && readingStatus(reading) === "valid")
    .map((reading) => ({ time: timeOf(reading.measured_at), value: parseDecimal(reading.effective_value) as number }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
}

export type TrendGeometry = {
  path: string;
  points: { x: number; y: number }[];
  min: number;
  max: number;
};

/** Projects a series into an SVG viewBox of `width` × `height` with inner padding. */
export function trendGeometry(
  series: readonly TrendPoint[],
  width: number,
  height: number,
  padding = 8,
): TrendGeometry | null {
  if (series.length === 0) return null;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const first = series[0].time;
  const last = series[series.length - 1].time;
  const spanX = last - first;
  const spanY = max - min;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const points = series.map((point) => ({
    x: padding + (spanX === 0 ? innerW / 2 : ((point.time - first) / spanX) * innerW),
    y: padding + (spanY === 0 ? innerH / 2 : (1 - (point.value - min) / spanY) * innerH),
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return { path, points, min, max };
}

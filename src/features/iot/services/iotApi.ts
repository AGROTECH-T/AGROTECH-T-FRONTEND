import { getJson } from "../../../services/api/client.ts";
import { onSessionEnd } from "../../../services/sessionMemory.ts";
import { readToken } from "../../auth/services/session.ts";

export type IotDevice = {
  uid: string;
  name?: string;
  location_label?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type IotCoordinator = IotDevice;
/** Physical provenance embedded in a sensor (`SensorSourceSummarySerializer`). */
export type IotSensorSource = {
  uid: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
  role: "primary" | "backup_comparison";
  description: string;
};
export type IotSensor = {
  uid: string;
  /** `PositiveSmallIntegerField` in Django: serialized as a JSON number. */
  channel: number;
  metric: string;
  unit: string;
  is_active: boolean;
  coordinator_uid: string;
  source: IotSensorSource | null;
};

/**
 * Decimal values coming from DRF. Model `DecimalField`s arrive as strings
 * ("23.50"); values returned by `SerializerMethodField` may be encoded as JSON
 * numbers. Both shapes are accepted and parsed defensively.
 */
export type IotDecimal = string | number;

export type IotCorrectionActor = "process" | { type: "user"; name: string };
export type IotCorrectionType = "value_adjustment" | "invalidation";
/** `CorrectionSummarySerializer` embedded as `latest_correction`. */
export type IotCorrectionSummary = {
  uid: string;
  revision: number;
  correction_type: IotCorrectionType;
  value_before: IotDecimal | null;
  corrected_value: IotDecimal | null;
  reason: string;
  created_at: string;
  actor: IotCorrectionActor;
};
/** `MeasurementSerializer`: public fields of one reading. */
export type IotReading = {
  uid: string;
  sensor_uid: string;
  metric: string;
  /** Original decoded value; null when the frame carried no usable value. */
  value: IotDecimal | null;
  unit: string;
  measured_at: string;
  server_received_at: string;
  measured_at_approximate: boolean;
  original_value: IotDecimal | null;
  latest_correction: IotCorrectionSummary | null;
  /** Value to display: latest correction, or null when invalidated or empty. */
  effective_value: IotDecimal | null;
};
export type IotRecord = IotDevice | IotSensor | IotReading;
export type IotPage<T = IotRecord> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type IotResource = "gateways" | "coordinators" | "sensors" | "readings";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_READING_RANGE_MS = 31 * DAY_MS;
const DEFAULT_READING_RANGE_MS = 7 * DAY_MS;

function localDateBoundary(value: string, endOfDay: boolean): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Escribe una fecha válida.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    throw new RangeError("Escribe una fecha válida.");
  }
  return result;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function localIsoWithOffset(value: Date, endOfDay: boolean): string {
  const offsetMinutes = -value.getTimezoneOffset();
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absoluteOffset = Math.abs(offsetMinutes);
  const fraction = endOfDay ? "999999" : "000000";
  return `${pad(value.getFullYear(), 4)}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.${fraction}` +
    `${sign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;
}

/**
 * Builds inclusive reading boundaries from calendar dates in the browser's
 * local timezone. The API requires ISO-8601 timestamps with an explicit offset.
 */
export function readingDateParams(
  params: URLSearchParams,
  from: string,
  to: string,
  now = new Date(),
): URLSearchParams {
  const start = from ? localDateBoundary(from, false) : null;
  const end = to ? localDateBoundary(to, true) : null;
  const effectiveEnd = end ?? now;
  const effectiveStart = start ?? new Date(effectiveEnd.getTime() - DEFAULT_READING_RANGE_MS);

  if (effectiveStart > effectiveEnd) {
    throw new RangeError("La fecha inicial no puede ser posterior a la fecha final.");
  }
  if (effectiveEnd.getTime() - effectiveStart.getTime() > MAX_READING_RANGE_MS) {
    throw new RangeError("El intervalo de consulta no puede superar los 31 días.");
  }
  if (start) params.set("from", localIsoWithOffset(start, false));
  if (end) params.set("to", localIsoWithOffset(end, true));
  return params;
}

/** Monotonic request guard used to ignore responses from superseded views. */
export class IotRequestGuard {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  invalidate(): void {
    this.current += 1;
  }

  isCurrent(request: number): boolean {
    return request === this.current;
  }
}

/** Confirms access only from the refreshed list returned by the farms API. */
export function farmIsAccessible(farmId: number, farms: readonly { id: number }[]): boolean {
  return farms.some((farm) => farm.id === farmId);
}

export function iotPath(farmId: number, resource: IotResource): string {
  return `/api/v1/iot/farms/${farmId}/${resource}/`;
}
const IOT_FRESH_MS = 20_000;

type IotEntry<T> = {
  at: number;
  promise: Promise<IotPage<T>>;
  snap?: IotPage<T>;
};

const iotPages = new Map<string, IotEntry<IotRecord>>();
const sensorLists = new Map<number, IotEntry<IotSensor>>();

function iotKey(farmId: number, resource: IotResource, params: URLSearchParams): string {
  return `${farmId}:${resource}:${params.toString()}`;
}

function isFresh(at: number): boolean {
  return Date.now() - at < IOT_FRESH_MS;
}

/** Página ya traída, para pintar la pantalla sin esperar otra vez. */
export function iotPageNow<T>(
  farmId: number,
  resource: IotResource,
  params: URLSearchParams,
): IotPage<T> | null {
  return (iotPages.get(iotKey(farmId, resource, params))?.snap as IotPage<T> | undefined) ?? null;
}

/** Sensores ya reunidos de esa finca. */
export function sensorsNow(farmId: number): IotPage<IotSensor> | null {
  return sensorLists.get(farmId)?.snap ?? null;
}

/** Suelta las lecturas y dispositivos recordados. */
export function forgetIot(farmId?: number): void {
  if (farmId == null) {
    iotPages.clear();
    sensorLists.clear();
    return;
  }
  const prefix = `${farmId}:`;
  for (const key of iotPages.keys()) {
    if (key.startsWith(prefix)) iotPages.delete(key);
  }
  sensorLists.delete(farmId);
}

onSessionEnd(() => forgetIot());

export function listIot<T>(farmId: number, resource: IotResource, params: URLSearchParams): Promise<IotPage<T>> {
  const key = iotKey(farmId, resource, params);
  const current = iotPages.get(key);
  if (current && isFresh(current.at)) return current.promise as Promise<IotPage<T>>;
  const query = params.size ? `?${params.toString()}` : "";
  const at = Date.now();
  const promise = getJson<IotPage<T>>(`${iotPath(farmId, resource)}${query}`, readToken())
    .then((page) => {
      const entry = iotPages.get(key);
      if (entry?.promise === promise) entry.snap = page as IotPage<IotRecord>;
      return page;
    })
    .catch((error: unknown) => {
      if (iotPages.get(key)?.promise === promise) iotPages.delete(key);
      throw error;
    });
  iotPages.set(key, { at, promise: promise as Promise<IotPage<IotRecord>> });
  return promise;
}
export const pageParams = (page = 1, pageSize = 20) => new URLSearchParams({ page: String(page), page_size: String(pageSize) });

/** Reads every page for selectors that must offer all records, such as sensors. */
async function collectIot<T>(farmId: number, resource: IotResource): Promise<IotPage<T>> {
  let page = 1;
  let response = await listIot<T>(farmId, resource, pageParams(page, 100));
  const results = [...response.results];
  while (response.next) {
    page += 1;
    response = await listIot<T>(farmId, resource, pageParams(page, 100));
    results.push(...response.results);
  }
  return { count: response.count, next: null, previous: null, results };
}

export async function listAllIot<T>(farmId: number, resource: IotResource): Promise<IotPage<T>> {
  if (resource !== "sensors") return collectIot(farmId, resource);
  const current = sensorLists.get(farmId);
  if (current && isFresh(current.at)) return current.promise as Promise<IotPage<T>>;
  const at = Date.now();
  const promise = collectIot<IotSensor>(farmId, "sensors")
    .then((page) => {
      const entry = sensorLists.get(farmId);
      if (entry?.promise === promise) entry.snap = page;
      return page;
    })
    .catch((error: unknown) => {
      if (sensorLists.get(farmId)?.promise === promise) sensorLists.delete(farmId);
      throw error;
    });
  sensorLists.set(farmId, { at, promise });
  return promise as Promise<IotPage<T>>;
}

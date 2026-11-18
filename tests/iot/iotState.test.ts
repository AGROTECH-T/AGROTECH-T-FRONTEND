import { afterEach, describe, expect, it, vi } from "vitest";
import { latestReceivedAt } from "../../src/features/iot/components/IotScreen.tsx";
import type { IotCorrectionSummary, IotReading, IotSensor } from "../../src/features/iot/services/iotApi.ts";
import {
  activityEstimate,
  adjustedOriginalText,
  initialIotQuery,
  iotQueryReducer,
  iotRequestPlan,
  latestReadingsBySensor,
  parseDecimal,
  readingStatus,
  readingValueText,
  summaryFromDate,
  trendGeometry,
  trendSeries,
  type IotQuery,
} from "../../src/features/iot/services/iotState.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

const sensor: IotSensor = { uid: "SN-AAAAAAA234", channel: 2, metric: "temperature", unit: "°C", is_active: true, coordinator_uid: "CO-AAAAAAA234", source: null };

function correction(type: IotCorrectionSummary["correction_type"], corrected: string | null): IotCorrectionSummary {
  return { uid: "CR-1", revision: 1, correction_type: type, value_before: "20.00", corrected_value: corrected, reason: "r", created_at: "2026-11-13T11:00:00Z", actor: "process" };
}

function reading(overrides: Partial<IotReading> = {}): IotReading {
  return {
    uid: `ME-${Math.random()}`,
    sensor_uid: sensor.uid,
    metric: "temperature",
    value: "20.00",
    unit: "°C",
    measured_at: "2026-11-13T10:00:00Z",
    server_received_at: "2026-11-13T10:00:02Z",
    measured_at_approximate: false,
    original_value: "20.00",
    latest_correction: null,
    effective_value: 20,
    ...overrides,
  };
}

describe("pagination (regression: page reset to 1 on every navigation)", () => {
  it("keeps the requested page after navigating forward and back", () => {
    const history = iotQueryReducer(initialIotQuery, { type: "view", view: "Historial" });
    const page2 = iotQueryReducer(history, { type: "navigate", direction: 1, loading: false });
    expect(page2.page).toBe(2);
    const page3 = iotQueryReducer(page2, { type: "navigate", direction: 1, loading: false });
    expect(page3.page).toBe(3);
    expect(iotQueryReducer(page3, { type: "navigate", direction: -1, loading: false }).page).toBe(2);
  });

  it("requests the page that was navigated to", () => {
    const query: IotQuery = { ...initialIotQuery, view: "Historial", page: 2 };
    const [request] = iotRequestPlan(query.view, query.page, query, new Date("2026-11-16T12:00:00Z"));
    expect(request.resource).toBe("readings");
    expect(request.params.get("page")).toBe("2");
    const gateways = iotRequestPlan("Gateways", 3, query);
    expect(gateways[0].params.get("page")).toBe("3");
  });

  it("returns the same state when nothing changes, so the load effect does not re-run", () => {
    const state: IotQuery = { ...initialIotQuery, view: "Historial", page: 4, sensorUid: sensor.uid };
    expect(iotQueryReducer(state, { type: "view", view: "Historial" })).toBe(state);
    expect(iotQueryReducer(state, { type: "sensor", sensorUid: sensor.uid })).toBe(state);
    expect(iotQueryReducer(state, { type: "sensorsLoaded", sensors: [sensor] })).toBe(state);
    expect(iotQueryReducer(state, { type: "navigate", direction: 1, loading: true })).toBe(state);
  });

  it("resets to page 1 only when the query itself changes", () => {
    const state: IotQuery = { ...initialIotQuery, view: "Historial", page: 4, sensorUid: sensor.uid };
    expect(iotQueryReducer(state, { type: "view", view: "Gateways" }).page).toBe(1);
    expect(iotQueryReducer(state, { type: "sensor", sensorUid: "" }).page).toBe(1);
    expect(iotQueryReducer(state, { type: "from", value: "2026-11-01" }).page).toBe(1);
    expect(iotQueryReducer(state, { type: "to", value: "2026-11-10" }).page).toBe(1);
    expect(iotQueryReducer(state, { type: "farmChanged" })).toMatchObject({ page: 1, sensorUid: "" });
    expect(iotQueryReducer(state, { type: "sensorsLoaded", sensors: [] })).toMatchObject({ page: 1, sensorUid: "" });
  });
});

describe("effective value and reading status", () => {
  it("parses DRF decimals as strings or numbers and rejects empty values", () => {
    expect(parseDecimal("23.50")).toBe(23.5);
    expect(parseDecimal(23.5)).toBe(23.5);
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });

  it("shows the effective value, not the raw value, after an adjustment", () => {
    const adjusted = reading({ value: "20.00", original_value: "20.00", effective_value: "21.50", latest_correction: correction("value_adjustment", "21.50") });
    expect(readingStatus(adjusted)).toBe("valid");
    expect(readingValueText(adjusted)).toContain("21,5");
    expect(readingValueText(adjusted)).not.toContain("20");
    expect(adjustedOriginalText(adjusted)).toContain("20");
  });

  it("never shows the original value of an invalidated reading", () => {
    const invalidated = reading({ value: "20.00", original_value: "20.00", effective_value: null, latest_correction: correction("invalidation", null) });
    expect(readingStatus(invalidated)).toBe("invalidated");
    expect(readingValueText(invalidated)).toBe("Invalidada");
    expect(adjustedOriginalText(invalidated)).toBeNull();
  });

  it("marks readings without a usable value as null", () => {
    const empty = reading({ value: null, original_value: null, effective_value: null });
    expect(readingStatus(empty)).toBe("null");
    expect(readingValueText(empty)).toBe("Sin valor");
    expect(adjustedOriginalText(reading())).toBeNull();
  });
});

describe("dashboard derivations", () => {
  it("keeps the latest reading of each sensor regardless of input order", () => {
    const older = reading({ uid: "old", measured_at: "2026-11-13T09:00:00Z" });
    const newer = reading({ uid: "new", measured_at: "2026-11-13T11:00:00Z" });
    const other = reading({ uid: "other", sensor_uid: "SN-BBBBBBB234" });
    const latest = latestReadingsBySensor([older, other, newer]);
    expect(latest.get(sensor.uid)?.uid).toBe("new");
    expect(latest.get("SN-BBBBBBB234")?.uid).toBe("other");
  });

  it("plots only valid effective values, oldest first", () => {
    const series = trendSeries([
      reading({ measured_at: "2026-11-13T12:00:00Z", effective_value: "22.00" }),
      reading({ measured_at: "2026-11-13T10:00:00Z", effective_value: 20 }),
      reading({ measured_at: "2026-11-13T11:00:00Z", effective_value: null, latest_correction: correction("invalidation", null) }),
      reading({ measured_at: "2026-11-13T11:30:00Z", value: null, original_value: null, effective_value: null }),
      reading({ sensor_uid: "SN-BBBBBBB234", effective_value: 99 }),
    ], sensor.uid);
    expect(series.map((point) => point.value)).toEqual([20, 22]);
  });

  it("projects a trend into the SVG box and handles flat series", () => {
    const geometry = trendGeometry([{ time: 0, value: 10 }, { time: 10, value: 20 }], 100, 50, 0);
    expect(geometry).toMatchObject({ min: 10, max: 20, path: "M0.0 50.0 L100.0 0.0" });
    const flat = trendGeometry([{ time: 0, value: 5 }, { time: 10, value: 5 }], 100, 50, 0);
    expect(flat?.points.every((point) => point.y === 25)).toBe(true);
    expect(trendGeometry([], 100, 50)).toBeNull();
  });

  it("estimates recent activity from server reception only", () => {
    const reference = Date.parse("2026-11-13T10:20:00Z");
    expect(activityEstimate("2026-11-13T10:00:00Z", reference)).toBe("recent");
    expect(activityEstimate("2026-11-13T09:00:00Z", reference)).toBe("stale");
    expect(activityEstimate(null, reference)).toBe("unknown");
    expect(activityEstimate("no-date", reference)).toBe("unknown");
  });

  it("reports the latest server reception in the sample", () => {
    expect(latestReceivedAt([
      reading({ server_received_at: "2026-11-13T10:00:00Z" }),
      reading({ server_received_at: "2026-11-13T12:00:00Z" }),
    ])).toBe("2026-11-13T12:00:00Z");
    expect(latestReceivedAt([])).toBeNull();
  });

  it("asks the summary for a window the backend accepts (≤ 31 days)", () => {
    vi.stubEnv("TZ", "America/Bogota");
    const now = new Date("2026-11-16T15:00:00Z");
    expect(summaryFromDate(now)).toBe("2026-10-17");
    const plan = iotRequestPlan("Resumen", 5, { sensorUid: "", from: "", to: "" }, now);
    const readings = plan.find((request) => request.resource === "readings");
    expect(readings?.params.get("page")).toBe("1");
    expect(readings?.params.get("page_size")).toBe("100");
    expect(readings?.params.get("ordering")).toBe("-measured_at");
    expect(readings?.params.get("from")).toBe("2026-10-17T00:00:00.000000-05:00");
    expect(iotRequestPlan("Sensores", 1, { sensorUid: "", from: "", to: "" })).toEqual([]);
  });
});

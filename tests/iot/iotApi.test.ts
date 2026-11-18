import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { iotErrorText } from "../../src/features/iot/components/IotScreen.tsx";
import {
  farmIsAccessible,
  IotRequestGuard,
  iotPath,
  listAllIot,
  listIot,
  pageParams,
  readingDateParams,
  type IotPage,
  type IotReading,
  type IotSensor,
} from "../../src/features/iot/services/iotApi.ts";
import {
  firstHistoryPage,
  historyPageAfterNavigation,
  selectedFarmAfterAccessRefresh,
  sensorSelectionAfterFarmChange,
  sensorSelectionAfterLoad,
} from "../../src/features/iot/services/iotState.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("IoT API contract", () => {
  it("scopes every resource to the selected farm", () => {
    expect(iotPath(7, "gateways")).toBe("/api/v1/iot/farms/7/gateways/");
    expect(iotPath(9, "coordinators")).toBe("/api/v1/iot/farms/9/coordinators/");
    expect(iotPath(7, "sensors")).toBe("/api/v1/iot/farms/7/sensors/");
    expect(iotPath(7, "readings")).toBe("/api/v1/iot/farms/7/readings/");
  });

  it("uses DRF pagination parameters", () => {
    expect(pageParams().toString()).toBe("page=1&page_size=20");
    expect(pageParams(3, 50).toString()).toBe("page=3&page_size=50");
    expect(pageParams(2, 20).toString()).toBe("page=2&page_size=20");
  });

  it("matches the serializer fields for sensors and readings", () => {
    const sensor: IotSensor = { uid: "SN-ABCDEFG234", channel: 1, metric: "moisture", unit: "%", is_active: true, coordinator_uid: "CO-ABCDEFG234", source: null };
    const reading: IotReading = { uid: "ME-ABCDEFG234", sensor_uid: sensor.uid, metric: sensor.metric, value: "42.00", unit: "%", measured_at: "2026-11-13T10:00:00Z", server_received_at: "2026-11-13T10:00:02Z", measured_at_approximate: false, original_value: "42.00", latest_correction: null, effective_value: 42 };
    const page: IotPage<IotReading> = { count: 1, next: null, previous: null, results: [reading] };
    expect(page.results[0]).toMatchObject({ sensor_uid: sensor.uid, measured_at: expect.any(String), server_received_at: expect.any(String) });
    expect(sensor).toHaveProperty("coordinator_uid");
    expect(typeof sensor.channel).toBe("number");
    expect(page.results[0]).not.toHaveProperty("received_at");
  });

  it("converts inclusive local calendar days to ISO timestamps with explicit offsets", () => {
    vi.stubEnv("TZ", "America/Bogota");
    const params = readingDateParams(new URLSearchParams(), "2026-11-14", "2026-11-14");
    expect(params.get("from")).toBe("2026-11-14T00:00:00.000000-05:00");
    expect(params.get("to")).toBe("2026-11-14T23:59:59.999999-05:00");
  });

  it("uses the selected timezone offset on each side of a daylight saving change", () => {
    vi.stubEnv("TZ", "America/New_York");
    const params = readingDateParams(new URLSearchParams(), "2026-03-08", "2026-03-08");
    expect(params.get("from")).toBe("2026-03-08T00:00:00.000000-05:00");
    expect(params.get("to")).toBe("2026-03-08T23:59:59.999999-04:00");
  });

  it("rejects reversed dates and ranges longer than the backend's 31 elapsed days", () => {
    vi.stubEnv("TZ", "America/Bogota");
    expect(() => readingDateParams(new URLSearchParams(), "2026-11-15", "2026-11-14"))
      .toThrow("La fecha inicial no puede ser posterior a la fecha final.");
    expect(() => readingDateParams(new URLSearchParams(), "2026-01-01", "2026-02-02"))
      .toThrow("El intervalo de consulta no puede superar los 31 días.");
    expect(() => readingDateParams(new URLSearchParams(), "2026-01-01", "2026-01-31"))
      .not.toThrow();
  });

  it("rejects invalid calendar dates instead of normalizing them", () => {
    expect(() => readingDateParams(new URLSearchParams(), "2026-02-30", ""))
      .toThrow("Escribe una fecha válida.");
  });

  it("builds a paginated HTTP request for the selected farm and page", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "session-token" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 21, next: "next", previous: null, results: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await listIot(7, "readings", pageParams(2, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/iot/farms/7/readings/?page=2&page_size=20");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer session-token");
  });

  it("loads all sensor pages and returns an explicit empty result", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "session-token" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 101, next: "?page=2", previous: null, results: [{ uid: "S1" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ count: 101, next: null, previous: "?page=1", results: [{ uid: "S2" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const all = await listAllIot<IotSensor>(7, "sensors");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("page=1&page_size=100");
    expect(fetchMock.mock.calls[1][0]).toContain("page=2&page_size=100");
    expect(all.results.map((sensor) => sensor.uid)).toEqual(["S1", "S2"]);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: 0, next: null, previous: null, results: [] }), { status: 200 })));
    await expect(listAllIot<IotSensor>(9, "sensors")).resolves.toMatchObject({ count: 0, results: [] });
  });

  it("discards an older response after a newer farm or page request begins", async () => {
    const guard = new IotRequestGuard();
    let resolveOld!: (value: string) => void;
    let resolveNew!: (value: string) => void;
    const oldResult = new Promise<string>((resolve) => { resolveOld = resolve; });
    const newResult = new Promise<string>((resolve) => { resolveNew = resolve; });
    let visibleResult = "";
    const older = guard.begin();
    const oldConsumer = oldResult.then((value) => { if (guard.isCurrent(older)) visibleResult = value; });
    const newer = guard.begin();
    const newConsumer = newResult.then((value) => { if (guard.isCurrent(newer)) visibleResult = value; });
    resolveNew("finca actual / página 2");
    await newConsumer;
    resolveOld("finca anterior / página 1");
    await oldConsumer;
    expect(visibleResult).toBe("finca actual / página 2");
    guard.invalidate();
    expect(guard.isCurrent(newer)).toBe(false);
  });

  it("confirms farm access only against the refreshed accessible-farms list", () => {
    expect(farmIsAccessible(7, [{ id: 7 }, { id: 8 }])).toBe(true);
    expect(farmIsAccessible(7, [{ id: 8 }])).toBe(false);
  });

  it("clears farm-specific sensor filters and retains only sensors in the current list", () => {
    const sensor: IotSensor = { uid: "SN-ABCDEFG234", channel: 1, metric: "moisture", unit: "%", is_active: true, coordinator_uid: "CO-ABCDEFG234", source: null };
    expect(sensorSelectionAfterFarmChange()).toBe("");
    expect(sensorSelectionAfterLoad(sensor.uid, [sensor])).toBe(sensor.uid);
    expect(sensorSelectionAfterLoad(sensor.uid, [])).toBe("");
  });

  it("resets filtered history to page one and prevents navigation while loading", () => {
    expect(firstHistoryPage()).toBe(1);
    expect(historyPageAfterNavigation(3, 1, false)).toBe(4);
    expect(historyPageAfterNavigation(3, -1, false)).toBe(2);
    expect(historyPageAfterNavigation(1, -1, false)).toBe(1);
    expect(historyPageAfterNavigation(3, 1, true)).toBe(3);
  });

  it("clears an inaccessible farm selection without choosing another farm", () => {
    expect(selectedFarmAfterAccessRefresh(7, [{ id: 7 }])).toBe(7);
    expect(selectedFarmAfterAccessRefresh(7, [{ id: 8 }])).toBeNull();
  });

  it("shows distinct messages for expired sessions and forbidden access", () => {
    expect(iotErrorText(new ApiError(401, "la sesion vencio"))).toBe("Tu sesión terminó. Vuelve a iniciar sesión.");
    expect(iotErrorText(new ApiError(403, "prohibido"))).toBe("No tienes permiso para consultar este recurso.");
    expect(iotErrorText(new TypeError("Failed to fetch"))).toContain("Revisa tu conexión");
  });
});

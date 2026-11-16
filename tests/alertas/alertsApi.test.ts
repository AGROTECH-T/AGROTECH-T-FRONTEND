/**
 * Pruebas del cliente de avisos de stock.
 *
 * Propósito: fijar la ruta, el cache y el Bearer del listado de alertas.
 * Contexto: la pantalla de notificaciones depende de este servicio.
 * @author Cristian Deysdayr Jimenez
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

function memoryStorage(): Storage {
  return {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => [...storage.keys()][index] ?? null,
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  };
}

beforeEach(() => {
  storage.clear();
  storage.set("agrotech.token", "token-aviso");
  storage.set("agrotech.token-at", String(Date.now()));
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("listAlerts", () => {
  it("consulta los avisos sin guardar respuesta en caché", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { listAlerts } = await import("../../src/features/alertas/services/alertsApi.ts");

    const data = await listAlerts();

    expect(data).toEqual({ results: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8090/api/v1/alerts/");
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-aviso");
  });
});

/**
 * Pruebas del cliente HTTP compartido.
 *
 * Propósito: comprobar el contrato con fetch, el Bearer y la renovación
 * de sesión sin salir a la red.
 * Contexto: sessionStorage se simula con un mapa en memoria.
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ROOT = "http://localhost:8090";

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("postJson", () => {
  it("envía JSON sin sesión y devuelve el cuerpo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ token: "abc" }));
    vi.stubGlobal("fetch", fetchMock);
    const { postJson } = await import("../../src/services/api/client.ts");

    const body = await postJson<{ token: string }>("/api/v1/auth/login/", {
      identification: "10203040",
    });

    expect(body).toEqual({ token: "abc" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ROOT}/api/v1/auth/login/`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"identification":"10203040"}');
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBeNull();
  });
});

describe("getJson", () => {
  it("manda el Bearer y respeta el cache pedido", async () => {
    storage.set("agrotech.token", "token-vigente");
    storage.set("agrotech.token-at", String(Date.now()));
    const fetchMock = vi.fn().mockResolvedValue(json({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getJson } = await import("../../src/services/api/client.ts");

    await getJson("/api/v1/alerts/", "token-vigente", "no-store");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${ROOT}/api/v1/alerts/`);
    expect(init.cache).toBe("no-store");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-vigente");
  });

  it("traduce el aviso de límite de intentos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ error: "throttled, disponible en 120 segundos" }, 429));
    vi.stubGlobal("fetch", fetchMock);
    const { getJson } = await import("../../src/services/api/client.ts");

    await expect(getJson("/api/v1/auth/me/", "")).rejects.toThrow(
      "Límite de intentos alcanzado. Se restablece en 2 minutos.",
    );
  });

  it("usa el mensaje por defecto si el error no viene en JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    const { getJson } = await import("../../src/services/api/client.ts");

    await expect(getJson("/api/v1/auth/me/", "")).rejects.toThrow(
      "No se pudo completar la solicitud",
    );
  });

  it("renueva la sesión vencida antes de consultar", async () => {
    storage.set("agrotech.token", "viejo");
    storage.set("agrotech.token-at", String(Date.now() - 6 * 60 * 1000));
    const calls: Array<[string, RequestInit]> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return url.endsWith("/renew/") ? json({ token: "nuevo" }) : json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getJson } = await import("../../src/services/api/client.ts");

    await getJson("/api/v1/privado/", "viejo");

    expect(calls[0][0]).toBe(`${ROOT}/api/v1/auth/session/renew/`);
    expect(new Headers(calls[1][1].headers).get("Authorization")).toBe("Bearer nuevo");
    expect(storage.get("agrotech.token")).toBe("nuevo");
  });

  it("si la renovación falla, consulta con el token y no reintenta enseguida", async () => {
    storage.set("agrotech.token", "viejo");
    storage.set("agrotech.token-at", String(Date.now() - 6 * 60 * 1000));
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push(url);
      if (url.endsWith("/renew/")) return new Response("", { status: 500 });
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer viejo");
      return json({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { getJson } = await import("../../src/services/api/client.ts");

    await getJson("/api/v1/uno/", "viejo");
    await getJson("/api/v1/dos/", "viejo");

    expect(calls.filter((url) => url.endsWith("/renew/"))).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });
});

describe("deleteJson", () => {
  it("acepta la respuesta sin contenido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const { deleteJson } = await import("../../src/services/api/client.ts");

    await expect(deleteJson("/api/v1/inventory/1/products/2/", "")).resolves.toBeUndefined();
  });

  it("lanza el mensaje del backend cuando falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json({ error: "insumo no encontrado" }, 404)),
    );
    const { deleteJson } = await import("../../src/services/api/client.ts");

    await expect(deleteJson("/api/v1/inventory/1/products/2/", "")).rejects.toThrow(
      "insumo no encontrado",
    );
  });
});

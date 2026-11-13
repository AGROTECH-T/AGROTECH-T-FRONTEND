/**
 * Pruebas de F10.2-CORRECCIONES: renovación, rotación y pestañas.
 *
 * Propósito: una solicitud que salió con un token rotado se reintenta una sola
 * vez con el vigente; otros 401 no se reintentan; la renovación no se repite
 * con otro token; dos pestañas con el mismo token inicial terminan con una
 * sesión viva y la otra cerrada de forma limpia; la inactividad prolongada
 * cierra la sesión.
 * Contexto: entorno node con un "servidor" simulado que rota el token como
 * session_service.rotate (el anterior deja de valer al instante). No es un
 * navegador real: no hay pestañas reales, eventos reales ni red real.
 * @author Cristian Deysdayr Jimenez
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getJson, postJson } from "../../src/services/api/client.ts";
import { renewSession } from "../../src/features/auth/services/account.ts";
import { clearToken, readToken, saveToken } from "../../src/features/auth/services/session.ts";
import {
  createSessionRenewer,
  RENEW_AFTER_MS,
  RENEW_CHECK_MS,
  startActivityRenewal,
  type Renewer,
} from "../../src/features/auth/services/sessionRenewal.ts";

const T0 = "token-0";
const T1 = "token-1";
const EXPIRED = { error: "la sesion vencio" };

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

function bearer(init: RequestInit | undefined): string {
  return (new Headers(init?.headers).get("Authorization") ?? "").replace("Bearer ", "");
}

let storage: MemoryStorage;
let local: { setItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  storage = new MemoryStorage();
  local = { setItem: vi.fn() };
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("localStorage", local);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("solicitud en curso durante la renovación", () => {
  it("se reintenta una vez con el token rotado y no pierde la sesión", async () => {
    // Servidor: solo acepta el token vigente; renovar rota T0 → T1.
    const server = { current: T0 };
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
    let farmsCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/session/renew/")) {
        if (bearer(init) !== server.current) return json(401, EXPIRED);
        server.current = T1;
        return json(200, { token: T1 });
      }
      farmsCalls += 1;
      if (farmsCalls === 1) await firstGate; // la respuesta llega después de rotar
      return bearer(init) === server.current ? json(200, [{ id: 1 }]) : json(401, EXPIRED);
    });
    vi.stubGlobal("fetch", fetchMock);
    saveToken(T0);

    const inFlight = getJson<unknown[]>("/api/v1/farms/", readToken());
    const renewer = createSessionRenewer({
      readToken,
      saveToken,
      renew: renewSession,
      onExpired: vi.fn(),
    });
    expect(await renewer.renew()).toBe("renewed");
    releaseFirst();

    expect(await inFlight).toEqual([{ id: 1 }]);
    const farmCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/farms/"));
    expect(farmCalls.map(([, init]) => bearer(init))).toEqual([T0, T1]);
    expect(readToken()).toBe(T1);
  });

  it("sin rotación, un 401 no se reintenta", async () => {
    saveToken(T0);
    const fetchMock = vi.fn(async () => json(401, EXPIRED));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("/api/v1/farms/", T0)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("un 401 que no es de sesión (código incorrecto) nunca se reintenta", async () => {
    saveToken(T1);
    const fetchMock = vi.fn(async () => json(401, { error: "codigo invalido" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      postJson("/api/v1/auth/email/verification/confirm/", { code: "123456" }, T0),
    ).rejects.toMatchObject({ status: 401, serverMessage: "codigo invalido" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta como máximo una vez", async () => {
    saveToken(T1);
    const fetchMock = vi.fn(async () => json(401, EXPIRED));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getJson("/api/v1/farms/", T0)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("la renovación no se reintenta con otro token", async () => {
    saveToken(T1);
    const fetchMock = vi.fn(async () => json(401, EXPIRED));
    vi.stubGlobal("fetch", fetchMock);
    await expect(renewSession(T0)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("solicitudes sin token no se reintentan", async () => {
    saveToken(T1);
    const fetchMock = vi.fn(async () => json(401, EXPIRED));
    vi.stubGlobal("fetch", fetchMock);
    await expect(postJson("/api/v1/auth/login/", {})).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("dos pestañas con el mismo token inicial", () => {
  function tab(server: { current: string; issued: number }) {
    let stored = T0; // pestaña duplicada: copia inicial de sessionStorage
    const onExpired = vi.fn(() => {
      stored = "";
    });
    const renewer = createSessionRenewer({
      readToken: () => stored,
      saveToken: (token) => {
        stored = token;
      },
      renew: async (token) => {
        await Promise.resolve();
        if (token !== server.current) throw new ApiError(401, "la sesion vencio");
        server.issued += 1;
        server.current = `token-${server.issued}`;
        return { token: server.current };
      },
      onExpired,
    });
    return { renewer, onExpired, token: () => stored };
  }

  it("la primera que renueva conserva la sesión; la otra se cierra limpia", async () => {
    const server = { current: T0, issued: 0 };
    const a = tab(server);
    const b = tab(server);
    expect(await a.renewer.renew()).toBe("renewed");
    expect(await b.renewer.renew()).toBe("expired");
    expect(a.token()).toBe(server.current);
    expect(b.onExpired).toHaveBeenCalledTimes(1);
    expect(b.token()).toBe("");
    // B ya no reintenta en bucle: sin token no hay renovación.
    expect(await b.renewer.renew()).toBe("skipped");
    expect(b.onExpired).toHaveBeenCalledTimes(1);
  });

  it("renovaciones simultáneas: exactamente una pestaña sigue viva", async () => {
    const server = { current: T0, issued: 0 };
    const a = tab(server);
    const b = tab(server);
    const outcomes = await Promise.all([a.renewer.renew(), b.renewer.renew()]);
    expect(outcomes.sort()).toEqual(["expired", "renewed"]);
    const alive = [a, b].filter((t) => t.token() === server.current);
    expect(alive).toHaveLength(1);
    expect(local.setItem).not.toHaveBeenCalled();
  });
});

describe("programación de la renovación", () => {
  function harness(renewer: Renewer, renewSoon = false) {
    let clock = 0;
    let tick: () => void = () => undefined;
    let activity: () => void = () => undefined;
    const target = {
      addEventListener: vi.fn((_name: string, fn: EventListener) => {
        activity = () => fn(new Event("pointerdown"));
      }),
      removeEventListener: vi.fn(),
    };
    const stop = startActivityRenewal({
      renewer,
      renewSoon,
      target,
      now: () => clock,
      setTimer: (fn) => {
        tick = fn;
        return 1;
      },
      clearTimer: vi.fn(),
    });
    return {
      stop,
      wait: (ms: number) => {
        clock += ms;
      },
      tick: () => tick(),
      act: () => activity(),
    };
  }

  it("la actividad renueva en el acto cuando ya toca, sin esperar al tick", () => {
    const renewer: Renewer = { renew: vi.fn(async () => "renewed" as const) };
    const h = harness(renewer);
    h.wait(RENEW_AFTER_MS);
    h.act();
    expect(renewer.renew).toHaveBeenCalledTimes(1);
    h.act();
    expect(renewer.renew).toHaveBeenCalledTimes(1);
  });

  it("tras un fallo de red reintenta en la siguiente comprobación", async () => {
    const renew = vi
      .fn<() => Promise<"failed" | "renewed">>()
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("renewed");
    const h = harness({ renew });
    h.wait(RENEW_AFTER_MS);
    h.act();
    await Promise.resolve();
    await Promise.resolve();
    h.wait(RENEW_CHECK_MS);
    h.tick();
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it("inactividad prolongada: no renueva y, al volver, el 401 cierra la sesión", async () => {
    const onExpired = vi.fn();
    const renewer = createSessionRenewer({
      readToken: () => T0,
      saveToken: vi.fn(),
      renew: async () => {
        throw new ApiError(401, "la sesion vencio");
      },
      onExpired,
    });
    const spy = vi.spyOn(renewer, "renew");
    const h = harness(renewer);
    for (let i = 0; i < 60; i += 1) {
      h.wait(RENEW_CHECK_MS);
      h.tick();
    }
    expect(spy).not.toHaveBeenCalled();
    h.act();
    await vi.waitFor(() => expect(onExpired).toHaveBeenCalledTimes(1));
  });

  it("cerrar sesión limpia el token y detiene la renovación", async () => {
    saveToken(T0);
    const renewFn = vi.fn(async () => ({ token: T1 }));
    const onExpired = vi.fn();
    const renewer = createSessionRenewer({ readToken, saveToken, renew: renewFn, onExpired });
    const h = harness(renewer);
    clearToken();
    h.stop();
    expect(await renewer.renew()).toBe("skipped");
    h.wait(RENEW_AFTER_MS);
    h.tick();
    expect(renewFn).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
    expect(readToken()).toBe("");
    expect(local.setItem).not.toHaveBeenCalled();
  });
});

/**
 * Pruebas de F10.2: restauración y renovación de la sesión.
 *
 * Propósito: al recargar se recupera la cuenta con GET /auth/me usando el
 * token de la pestaña; un 401 la cierra; un fallo de red no muestra pantallas
 * autenticadas; la renovación solo ocurre con actividad y un 401 al renovar
 * termina la sesión. Nada se guarda en localStorage.
 * Contexto: entorno node, fetch y almacenamiento simulados, HTML estático.
 * Son pruebas de contrato con respuestas simuladas, no contra el backend real.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { AuthScreen, sessionEndedNotice } from "../../src/features/auth/components/AuthScreen.tsx";
import { SessionStatusView } from "../../src/features/auth/components/SessionStatusView.tsx";
import { renewSession } from "../../src/features/auth/services/account.ts";
import {
  ACTIVITY_EVENTS,
  createSessionRenewer,
  RENEW_AFTER_MS,
  RENEW_CHECK_MS,
  shouldRenew,
  startActivityRenewal,
  type Renewer,
} from "../../src/features/auth/services/sessionRenewal.ts";
import {
  RESTORE_FAILED_MESSAGE,
  restoreSession,
  SESSION_ENDED_NOTICE,
} from "../../src/features/auth/services/sessionRestore.ts";
import type { Account } from "../../src/features/auth/types/index.ts";

const TOKEN = "sesion-jwe";
const NEXT = "sesion-jwe-nueva";

const ACCOUNT: Account = {
  id: 7,
  first_name: "Ana",
  last_name: "Pérez",
  identification: "12345678",
  phone: "3001234567",
  correo: "ana@example.com",
  is_active: true,
  email_verified: true,
  can_create_farms: false,
  can_create_first_farm: true,
  can_open_inactive_farms: false,
};

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

let session: MemoryStorage;
let local: { setItem: ReturnType<typeof vi.fn>; getItem: ReturnType<typeof vi.fn> };

beforeEach(() => {
  session = new MemoryStorage();
  local = { setItem: vi.fn(), getItem: vi.fn(() => null) };
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("localStorage", local);
  vi.stubGlobal("location", { pathname: "/", hash: "" });
  vi.stubGlobal("history", { replaceState: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deps(token: string, fetchAccount: (token: string) => Promise<Account>) {
  return { readToken: () => token, fetchAccount: vi.fn(fetchAccount), clearToken: vi.fn() };
}

describe("restauración al recargar", () => {
  it("sin token no consulta nada", async () => {
    const d = deps("", async () => ACCOUNT);
    expect(await restoreSession(d)).toEqual({ kind: "none" });
    expect(d.fetchAccount).not.toHaveBeenCalled();
  });

  it("recupera cuenta, verificación y capacidades con el token guardado", async () => {
    const d = deps(TOKEN, async () => ACCOUNT);
    const result = await restoreSession(d);
    expect(result).toEqual({ kind: "restored", account: ACCOUNT });
    expect(d.fetchAccount).toHaveBeenCalledTimes(1);
    expect(d.fetchAccount).toHaveBeenCalledWith(TOKEN);
    expect(d.clearToken).not.toHaveBeenCalled();
  });

  it("JWT vencido (401): olvida el token y vuelve al acceso", async () => {
    const d = deps(TOKEN, async () => {
      throw new ApiError(401, "la sesion vencio");
    });
    expect(await restoreSession(d)).toEqual({ kind: "expired" });
    expect(d.clearToken).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["red", new TypeError("Failed to fetch")],
    ["500", new ApiError(500, "error")],
  ])("fallo de %s: conserva el token y no afirma sesión", async (_label, error) => {
    const d = deps(TOKEN, async () => {
      throw error;
    });
    expect(await restoreSession(d)).toEqual({ kind: "failed", message: RESTORE_FAILED_MESSAGE });
    expect(d.clearToken).not.toHaveBeenCalled();
  });

  it("consulta GET /api/v1/auth/me/ con Bearer y sin crear sesión", async () => {
    session.setItem("agrotech.token", TOKEN);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ACCOUNT), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await restoreSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/me\/$/);
    expect(init.method ?? "GET").toBe("GET");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(url).not.toContain("login");
  });

  it("con token guardado muestra la comprobación, no el login ni el panel", () => {
    session.setItem("agrotech.token", TOKEN);
    const html = renderToStaticMarkup(createElement(AuthScreen));
    expect(html).toContain("Comprobando tu sesión...");
    expect(html).not.toContain('id="signin-title"');
    expect(html).not.toContain("Bienvenido a AGROTECH-T");
  });

  it("sin token muestra directamente el login", () => {
    const html = renderToStaticMarkup(createElement(AuthScreen));
    expect(html).toContain('id="signin-title"');
    expect(html).not.toContain("Comprobando tu sesión");
  });

  it("el aviso de sesión terminada recuerda la invitación pendiente", () => {
    expect(sessionEndedNotice(false)).toBe(SESSION_ENDED_NOTICE);
    expect(sessionEndedNotice(true)).toContain("cuenta del correo invitado");
  });

  it("estados de carga y error de la tarjeta", () => {
    const busy = renderToStaticMarkup(
      createElement(SessionStatusView, { title: "Un momento", message: "Cargando", tone: "busy" }),
    );
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('role="status"');
    const warn = renderToStaticMarkup(
      createElement(SessionStatusView, {
        title: "Error",
        message: RESTORE_FAILED_MESSAGE,
        tone: "warn",
        actions: [{ label: "Reintentar", onClick: () => undefined }],
      }),
    );
    expect(warn).toContain('role="alert"');
    expect(warn).toContain("Reintentar");
  });
});

describe("renovación de la sesión", () => {
  function renewerWith(renew: (token: string) => Promise<{ token: string }>) {
    let stored = TOKEN;
    const saveToken = vi.fn((token: string) => {
      stored = token;
    });
    const onExpired = vi.fn();
    const renewFn = vi.fn(renew);
    const renewer = createSessionRenewer({
      readToken: () => stored,
      saveToken,
      renew: renewFn,
      onExpired,
    });
    return {
      renewer,
      saveToken,
      onExpired,
      renewFn,
      setStored: (value: string) => (stored = value),
    };
  }

  it("guarda el token nuevo", async () => {
    const r = renewerWith(async () => ({ token: NEXT }));
    expect(await r.renewer.renew()).toBe("renewed");
    expect(r.renewFn).toHaveBeenCalledWith(TOKEN);
    expect(r.saveToken).toHaveBeenCalledWith(NEXT);
    expect(r.onExpired).not.toHaveBeenCalled();
  });

  it("un 401 al renovar termina la sesión", async () => {
    const r = renewerWith(async () => {
      throw new ApiError(401, "la sesion vencio");
    });
    expect(await r.renewer.renew()).toBe("expired");
    expect(r.onExpired).toHaveBeenCalledTimes(1);
    expect(r.saveToken).not.toHaveBeenCalled();
  });

  it("un fallo de red no cierra la sesión", async () => {
    const r = renewerWith(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await r.renewer.renew()).toBe("failed");
    expect(r.onExpired).not.toHaveBeenCalled();
  });

  it("descarta la respuesta si la sesión cambió mientras viajaba", async () => {
    let finish: (value: { token: string }) => void = () => undefined;
    const r = renewerWith(() => new Promise((resolve) => (finish = resolve)));
    const pending = r.renewer.renew();
    r.setStored("");
    finish({ token: NEXT });
    expect(await pending).toBe("skipped");
    expect(r.saveToken).not.toHaveBeenCalled();
  });

  it("dos renovaciones simultáneas comparten una sola petición", async () => {
    let finish: (value: { token: string }) => void = () => undefined;
    const r = renewerWith(() => new Promise((resolve) => (finish = resolve)));
    const first = r.renewer.renew();
    const second = r.renewer.renew();
    finish({ token: NEXT });
    expect(await first).toBe("renewed");
    expect(await second).toBe("renewed");
    expect(r.renewFn).toHaveBeenCalledTimes(1);
  });

  it("solo renueva con actividad y tras el intervalo", () => {
    expect(shouldRenew(RENEW_AFTER_MS, 10, 0)).toBe(true);
    expect(shouldRenew(RENEW_AFTER_MS - 1, 10, 0)).toBe(false);
    expect(shouldRenew(RENEW_AFTER_MS * 3, 0, 0)).toBe(false);
    expect(shouldRenew(0, 0, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  function harness(renewSoon: boolean) {
    let clock = 0;
    let tick: () => void = () => undefined;
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: vi.fn((name: string, fn: EventListener) => listeners.set(name, fn)),
      removeEventListener: vi.fn((name: string) => listeners.delete(name)),
    };
    const clearTimer = vi.fn();
    const renewer: Renewer = { renew: vi.fn(async () => "renewed" as const) };
    const stop = startActivityRenewal({
      renewer,
      renewSoon,
      target,
      now: () => clock,
      setTimer: (fn, ms) => {
        expect(ms).toBe(RENEW_CHECK_MS);
        tick = fn;
        return 42;
      },
      clearTimer,
    });
    return {
      renewer,
      target,
      clearTimer,
      listeners,
      stop,
      advance: (ms: number) => {
        clock += ms;
        tick();
      },
      act: () => listeners.get("pointerdown")?.(new Event("pointerdown")),
    };
  }

  it("sin actividad no renueva (la inactividad conserva el vencimiento)", () => {
    const h = harness(false);
    h.advance(RENEW_AFTER_MS * 4);
    expect(h.renewer.renew).not.toHaveBeenCalled();
  });

  it("con actividad renueva una vez por intervalo", () => {
    const h = harness(false);
    h.advance(60_000);
    h.act();
    h.advance(RENEW_AFTER_MS);
    expect(h.renewer.renew).toHaveBeenCalledTimes(1);
    h.advance(RENEW_CHECK_MS);
    expect(h.renewer.renew).toHaveBeenCalledTimes(1);
  });

  it("una sesión restaurada se renueva en la primera comprobación", () => {
    const h = harness(true);
    h.advance(RENEW_CHECK_MS);
    expect(h.renewer.renew).toHaveBeenCalledTimes(1);
  });

  it("al detenerse retira oyentes y temporizador", () => {
    const h = harness(false);
    expect(h.target.addEventListener).toHaveBeenCalledTimes(ACTIVITY_EVENTS.length);
    h.stop();
    expect(h.clearTimer).toHaveBeenCalledWith(42);
    expect(h.target.removeEventListener).toHaveBeenCalledTimes(ACTIVITY_EVENTS.length);
  });

  it("renueva con POST /api/v1/auth/session/renew/ y Bearer", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ token: NEXT }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await renewSession(TOKEN)).toEqual({ token: NEXT });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/session\/renew\/$/);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("ni la restauración ni la renovación usan localStorage", async () => {
    session.setItem("agrotech.token", TOKEN);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(ACCOUNT), { status: 200 })),
    );
    await restoreSession();
    const r = renewerWith(async () => ({ token: NEXT }));
    await r.renewer.renew();
    expect(local.setItem).not.toHaveBeenCalled();
    expect(local.getItem).not.toHaveBeenCalled();
  });
});

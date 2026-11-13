/**
 * Pruebas de la aceptación de invitaciones a fincas (BUILD F4).
 *
 * Propósito: enlace sin sesión, conservación y recuperación del token, contrato
 * del POST, errores reales del backend (404 combinado, 409, 401, 429, 5xx, red),
 * doble clic, recarga, limpieza del token y navegación tras aceptar.
 * Contexto: entorno node; sessionStorage, location, history y fetch simulados;
 * HTML estático con renderToStaticMarkup (sin efectos ni DOM real).
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { AuthScreen, INVITATION_LOGIN_NOTICE } from "../../src/features/auth/components/AuthScreen.tsx";
import { HomeScreen } from "../../src/features/home/components/HomeScreen.tsx";
import { InvitationAcceptView } from "../../src/features/invitations/components/InvitationAcceptScreen.tsx";
import { ACCEPT_ENDPOINT, acceptInvitation } from "../../src/features/invitations/services/acceptApi.ts";
import {
  ACCEPTED_MESSAGE,
  ALREADY_MEMBER_MESSAGE,
  acceptOutcomeFromError,
  createAcceptRunner,
  INVALID_INVITATION_MESSAGE,
  NETWORK_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  UNEXPECTED_MESSAGE,
} from "../../src/features/invitations/services/acceptFlow.ts";
import {
  ACCEPT_PATH,
  clearPendingInvitation,
  isAcceptPath,
  parseInvitationToken,
  PENDING_INVITATION_KEY,
  readPendingInvitation,
  takePendingInvitation,
  type TokenStorage,
} from "../../src/features/invitations/services/pendingInvitation.ts";
import type { Account } from "../../src/features/auth/types/index.ts";
import type { AcceptState } from "../../src/features/invitations/types/index.ts";

const TOKEN = "Abc-123_xyz-TOKEN-ejemplo";
const SESSION = "sesion-jwe";

class MemoryStorage implements TokenStorage {
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

const account: Account = {
  id: 7,
  first_name: "Laura",
  last_name: "Gómez",
  identification: "1234567890",
  phone: "3000000000",
  correo: "laura@example.com",
  is_active: true,
  email_verified: true,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const noop = () => undefined;
const view = (state: AcceptState) =>
  renderToStaticMarkup(
    createElement(InvitationAcceptView, {
      account,
      state,
      onAccept: noop,
      onGoToFarm: noop,
      onGoToFarms: noop,
      onSwitchAccount: noop,
      onDiscard: noop,
    }),
  );

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  storage.setItem("agrotech.token", SESSION);
  vi.stubGlobal("sessionStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("enlace del correo", () => {
  it("reconoce la ruta y el token del fragmento sin recortarlo", () => {
    expect(isAcceptPath(ACCEPT_PATH)).toBe(true);
    expect(isAcceptPath(`${ACCEPT_PATH}/`)).toBe(true);
    expect(isAcceptPath("/")).toBe(false);
    expect(parseInvitationToken(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(parseInvitationToken("#token=")).toBeNull();
    expect(parseInvitationToken("")).toBeNull();
  });

  it("1. sin sesión muestra el login y no un error de invitación", () => {
    // F10.2: con un token guardado se restaura la sesión; "sin sesión" es sin token.
    storage.removeItem("agrotech.token");
    vi.stubGlobal("location", { pathname: ACCEPT_PATH, hash: `#token=${TOKEN}` });
    vi.stubGlobal("history", { replaceState: vi.fn() });
    const html = renderToStaticMarkup(createElement(AuthScreen));
    expect(html).toContain('id="signin-title"');
    expect(html).not.toContain("No pudimos aceptar");
    expect(html).not.toContain(TOKEN);
    expect(INVITATION_LOGIN_NOTICE).toContain("Inicia sesión");
  });

  it("2. conserva el token en sessionStorage y lo retira de la URL", () => {
    const history = { replaceState: vi.fn() };
    const token = takePendingInvitation(
      { pathname: ACCEPT_PATH, hash: `#token=${TOKEN}` },
      history,
      storage,
    );
    expect(token).toBe(TOKEN);
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBe(TOKEN);
    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/");
    const [, , url] = history.replaceState.mock.calls[0];
    expect(String(url)).not.toContain(TOKEN);
  });

  it("3. recupera el token después del login o en otra llamada (StrictMode)", () => {
    takePendingInvitation({ pathname: ACCEPT_PATH, hash: `#token=${TOKEN}` }, null, storage);
    expect(takePendingInvitation({ pathname: "/", hash: "" }, null, storage)).toBe(TOKEN);
    expect(readPendingInvitation(storage)).toBe(TOKEN);
    const html = view({ kind: "ready", message: "" });
    expect(html).toContain("Laura Gómez");
    expect(html).toContain("laura@example.com");
    expect(html).toContain("Aceptar invitación");
    expect(html).not.toContain(TOKEN);
  });

  it("sin invitación no inventa ningún token", () => {
    expect(takePendingInvitation({ pathname: "/", hash: "" }, null, storage)).toBeNull();
    expect(takePendingInvitation({ pathname: ACCEPT_PATH, hash: "" }, null, storage)).toBeNull();
  });
});

describe("POST /api/v1/invitations/accept/", () => {
  it("4. con la cuenta correcta envía solo el token y devuelve la finca", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { farm_id: 12, membership_id: 40, role: "operador", status: "active" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);

    const outcome = await createAcceptRunner(acceptInvitation, storage)(TOKEN);

    expect(outcome).toMatchObject({ kind: "accepted", farmId: 12, message: ACCEPTED_MESSAGE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).endsWith(ACCEPT_ENDPOINT)).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ token: TOKEN });
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${SESSION}`);
  });

  it("no recorta el token (trim_whitespace=False)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { farm_id: 1, membership_id: 2, role: "operador", status: "active" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await acceptInvitation(" raro ");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: " raro " });
  });

  it("5. correo distinto: 404 combinado, ofrece otra cuenta y conserva el token", async () => {
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const run = createAcceptRunner(
      () => Promise.reject(new ApiError(404, "invitación no encontrada")),
      storage,
    );
    const outcome = await run(TOKEN);
    expect(outcome.kind).toBe("invalid");
    expect(outcome.message).toBe(INVALID_INVITATION_MESSAGE);
    expect(outcome.message).toContain("no corresponda al correo invitado");
    expect(outcome.farmId).toBeUndefined();
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBe(TOKEN);
    const html = view(outcome);
    expect(html).toContain("Ingresar con otra cuenta");
    expect(html).toContain('role="alert"');
  });

  it("6. correo sin verificar: el backend responde el mismo 404 y se informa", () => {
    const outcome = acceptOutcomeFromError(new ApiError(404, "invitación no encontrada"));
    expect(outcome.kind).toBe("invalid");
    expect(outcome.message).toContain("verificado");
  });

  it("7. vencida o inválida: 404 combinado; 400 olvida el token", async () => {
    const expired = acceptOutcomeFromError(new ApiError(404, "invitación no encontrada"));
    expect(expired.message).toContain("vencido");
    expect(expired.message).toContain("cancelado");
    expect(expired.message).toContain("usado");

    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const run = createAcceptRunner(
      () => Promise.reject(new ApiError(400, "Este campo es requerido.")),
      storage,
    );
    expect((await run(TOKEN)).kind).toBe("invalid");
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBeNull();
  });

  it("409: ya es miembro, olvida el token y ofrece ir a Fincas", async () => {
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const run = createAcceptRunner(
      () => Promise.reject(new ApiError(409, "ya perteneces a esta finca")),
      storage,
    );
    const outcome = await run(TOKEN);
    expect(outcome).toMatchObject({ kind: "already_member", message: ALREADY_MEMBER_MESSAGE });
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBeNull();
    expect(view(outcome)).toContain("Ir a Fincas");
  });

  it("401, 429 y 5xx conservan el token y permiten reintentar", () => {
    const expired = acceptOutcomeFromError(new ApiError(401, "no autenticado"));
    expect(expired).toMatchObject({ kind: "session_expired", message: SESSION_EXPIRED_MESSAGE, forgetToken: false });
    expect(view(expired)).toContain("Iniciar sesión de nuevo");

    const limited = acceptOutcomeFromError(new ApiError(429, "Demasiados intentos"));
    expect(limited.kind).toBe("rate_limited");
    expect(limited.forgetToken).toBe(false);
    expect(view(limited)).toContain("Reintentar");

    const server = acceptOutcomeFromError(new ApiError(500, "boom"));
    expect(server).toMatchObject({ kind: "error", message: UNEXPECTED_MESSAGE, forgetToken: false });
  });
});

describe("duplicados, red y recarga", () => {
  it("8. doble clic: una sola solicitud y la misma respuesta", async () => {
    const pending = deferred<{ farm_id: number; membership_id: number; role: string; status: string }>();
    const accept = vi.fn(() => pending.promise);
    const run = createAcceptRunner(accept, storage);

    const first = run(TOKEN);
    const second = run(TOKEN);
    expect(second).toBe(first);
    expect(accept).toHaveBeenCalledTimes(1);

    pending.resolve({ farm_id: 3, membership_id: 9, role: "operador", status: "active" });
    expect((await first).farmId).toBe(3);
    expect((await run(TOKEN)).farmId).toBe(3);
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it("los botones quedan deshabilitados mientras se acepta", () => {
    const html = view({ kind: "accepting", message: "" });
    expect(html).toContain("Aceptando...");
    expect(html).toContain('aria-busy="true"');
    expect((html.match(/disabled=""/g) ?? []).length).toBe(3);
  });

  it("9. error de red: mensaje claro, conserva el token y reintenta", async () => {
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse(200, { farm_id: 5, membership_id: 6, role: "operador", status: "active" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const run = createAcceptRunner(acceptInvitation, storage);

    const failed = await run(TOKEN);
    expect(failed).toMatchObject({ kind: "network", message: NETWORK_MESSAGE });
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBe(TOKEN);

    const retried = await run(TOKEN);
    expect(retried.kind).toBe("accepted");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("11. recarga durante el proceso: el token sigue guardado hasta la respuesta", async () => {
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const pending = deferred<never>();
    const run = createAcceptRunner(() => pending.promise, storage);
    void run(TOKEN);
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBe(TOKEN);

    // Tras recargar, la pestaña recupera el token y un nuevo ejecutor reintenta.
    expect(takePendingInvitation({ pathname: "/", hash: "" }, null, storage)).toBe(TOKEN);
    const afterReload = createAcceptRunner(
      () => Promise.reject(new ApiError(404, "invitación no encontrada")),
      storage,
    );
    expect((await afterReload(TOKEN)).kind).toBe("invalid");
    pending.reject(new TypeError("abortada"));
  });
});

describe("éxito y limpieza", () => {
  it("10. tras aceptar ofrece ir a la finca y el shell abre Fincas", () => {
    const html = view({ kind: "accepted", message: ACCEPTED_MESSAGE, farmId: 12 });
    expect(html).toContain(ACCEPTED_MESSAGE);
    expect(html).toContain("Ir a la finca");
    expect(html).toContain('role="status"');

    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const shell = renderToStaticMarkup(
      createElement(HomeScreen, {
        account,
        onAccountChange: noop,
        onLogout: noop,
        initialSection: "fincas",
        initialFarmId: 12,
      }),
    );
    const home = renderToStaticMarkup(
      createElement(HomeScreen, { account, onAccountChange: noop, onLogout: noop }),
    );
    expect(shell).not.toBe(home);
    expect(shell).toContain("+ Nueva finca");
  });

  it("12. limpia el token tras aceptar y al descartar la invitación", async () => {
    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    const run = createAcceptRunner(
      () => Promise.resolve({ farm_id: 1, membership_id: 1, role: "operador", status: "active" }),
      storage,
    );
    await run(TOKEN);
    expect(storage.getItem(PENDING_INVITATION_KEY)).toBeNull();

    storage.setItem(PENDING_INVITATION_KEY, TOKEN);
    clearPendingInvitation(storage);
    expect(readPendingInvitation(storage)).toBeNull();
  });

  it("nunca escribe el token en la consola", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    takePendingInvitation({ pathname: ACCEPT_PATH, hash: `#token=${TOKEN}` }, null, storage);
    await createAcceptRunner(() => Promise.reject(new TypeError("x")), storage)(TOKEN);
    for (const spy of spies) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(TOKEN);
    }
  });
});

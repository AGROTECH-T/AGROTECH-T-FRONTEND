/**
 * Pruebas de la verificación obligatoria del correo (BUILD F5).
 *
 * Propósito: registro y bloqueo, envío y reenvío del OTP, confirmación con
 * recarga de /auth/me, código incorrecto o vencido, límite de solicitudes,
 * reingreso, ausencia de cuentas duplicadas e integración con invitaciones.
 * Contexto: entorno node; fetch y sessionStorage simulados; HTML estático.
 * Son pruebas de contrato con respuestas simuladas, no contra el backend real.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { EmailVerificationView } from "../../src/features/auth/components/EmailVerificationScreen.tsx";
import {
  confirmEmailVerification,
  fetchAccount,
  requestEmailVerification,
} from "../../src/features/auth/services/account.ts";
import { authStage } from "../../src/features/auth/services/authStage.ts";
import {
  codeFromDigits,
  confirmAndReload,
  EXPIRED_CODE_MESSAGE,
  INVALID_CODE_MESSAGE,
  needsEmailVerification,
  NOT_CONFIRMED_MESSAGE,
  requestCode,
  SESSION_EXPIRED_MESSAGE,
  singleFlight,
  verificationError,
  type VerificationApi,
} from "../../src/features/auth/services/verification.ts";
import type { Account } from "../../src/features/auth/types/index.ts";

const SESSION = "sesion-jwe";
const CODE = "482913";

const base: Account = {
  id: 2,
  first_name: "Ana",
  last_name: "García",
  identification: "1234567890",
  phone: "3001234567",
  correo: "ana@example.com",
  is_active: true,
  email_verified: false,
};

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const realApi: VerificationApi = {
  request: requestEmailVerification,
  confirm: confirmEmailVerification,
  fetchAccount,
};

const noop = () => undefined;
const view = (overrides: Partial<Parameters<typeof EmailVerificationView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(EmailVerificationView, {
      account: base,
      digits: ["", "", "", "", "", ""],
      sending: false,
      confirming: false,
      sent: true,
      cooldown: 0,
      error: null,
      onDigits: noop,
      onConfirm: noop,
      onResend: noop,
      onLogout: noop,
      ...overrides,
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

describe("registro y bloqueo", () => {
  it("1. una cuenta recién registrada (email_verified=false) va a la verificación", () => {
    expect(authStage(base, null)).toBe("verify");
    const html = view({ sent: true });
    expect(html).toContain("Verifica tu correo");
    expect(html).toContain("ana@example.com");
    expect(html).toContain("Verificar correo");
  });

  it("8. una cuenta sin verificar que inicia sesión no llega al shell", () => {
    expect(needsEmailVerification(base)).toBe(true);
    expect(authStage(base, null)).not.toBe("home");
    // Sin el campo (respuesta inesperada) también se bloquea.
    const { email_verified: _omit, ...legacy } = base;
    void _omit;
    expect(needsEmailVerification(legacy as Account)).toBe(true);
  });

  it("9. una cuenta verificada entra normalmente", () => {
    const verified = { ...base, email_verified: true };
    expect(needsEmailVerification(verified)).toBe(false);
    expect(authStage(verified, null)).toBe("home");
    expect(authStage(null, null)).toBe("access");
  });

  it("12. con invitación pendiente: primero verificación, después aceptación", () => {
    expect(authStage(base, "token-invitacion")).toBe("verify");
    expect(authStage({ ...base, email_verified: true }, "token-invitacion")).toBe("invitation");
  });
});

describe("envío y reenvío del código", () => {
  it("2. solicita el OTP al endpoint existente con la sesión", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, wait: 300 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await requestCode(realApi, SESSION);
    expect(result).toEqual({ status: "sent", lifetimeSeconds: 300 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).endsWith("/api/v1/auth/email/verification/")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({});
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${SESSION}`);
  });

  it("6. reenvío: las llamadas simultáneas comparten una petición y luego se permite otra", async () => {
    let release!: () => void;
    const request = vi.fn(
      () => new Promise<{ ok: boolean; wait: number }>((ok) => {
        release = () => ok({ ok: true, wait: 300 });
      }),
    );
    const send = singleFlight(() => requestCode({ ...realApi, request }, SESSION));
    const first = send();
    const second = send();
    expect(second).toBe(first);
    expect(request).toHaveBeenCalledTimes(1);
    release();
    await first;
    request.mockResolvedValueOnce({ ok: true, wait: 300 });
    await send();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("6b. el botón de reenvío muestra la espera y se deshabilita", () => {
    const html = view({ cooldown: 7 });
    expect(html).toContain("Reenviar en 7 s");
    expect(html).toMatch(/<button[^>]*class="otp-resend"[^>]*disabled=""/);
  });

  it("7. límite de solicitudes: 429 con la espera que indica el backend", async () => {
    const error = verificationError(
      new ApiError(429, "Podrás pedir otro código en 7 segundos.", { wait: 7 }),
    );
    expect(error).toMatchObject({ kind: "rate_limited", wait: 7 });
    expect(error.message).toContain("7 segundos");

    const hourly = verificationError(new ApiError(429, "Demasiadas solicitudes"));
    expect(hourly.kind).toBe("rate_limited");
    expect(hourly.wait).toBeUndefined();
  });
});

describe("confirmación", () => {
  it("3. confirma el código y solo concede acceso si /auth/me lo confirma", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
      .mockResolvedValueOnce(jsonResponse(200, { ...base, email_verified: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await confirmAndReload(realApi, SESSION, CODE);

    expect(result.status).toBe("verified");
    const [confirmUrl, confirmInit] = fetchMock.mock.calls[0];
    expect(String(confirmUrl).endsWith("/api/v1/auth/email/verification/confirm/")).toBe(true);
    expect(JSON.parse(confirmInit.body)).toEqual({ code: CODE });
    expect(String(fetchMock.mock.calls[1][0]).endsWith("/api/v1/auth/me/")).toBe(true);
  });

  it("4. código incorrecto: 401 'codigo invalido' no se confunde con sesión vencida", async () => {
    const api = { ...realApi, confirm: () => Promise.reject(new ApiError(401, "codigo invalido")) };
    const result = await confirmAndReload(api, SESSION, CODE);
    expect(result).toEqual({
      status: "failed",
      error: { kind: "invalid_code", message: INVALID_CODE_MESSAGE },
    });
    const sessionLost = verificationError(new ApiError(401, "credenciales invalidas"));
    expect(sessionLost).toEqual({ kind: "session_expired", message: SESSION_EXPIRED_MESSAGE });
  });

  it("5. código vencido: 401 'el codigo vencio'", () => {
    expect(verificationError(new ApiError(401, "el codigo vencio"))).toEqual({
      kind: "expired_code",
      message: EXPIRED_CODE_MESSAGE,
    });
  });

  it("un 200 del confirm sin email_verified=true no da acceso", async () => {
    const api: VerificationApi = {
      ...realApi,
      confirm: () => Promise.resolve({ ok: true }),
      fetchAccount: () => Promise.resolve(base),
    };
    const result = await confirmAndReload(api, SESSION, CODE);
    expect(result).toEqual({
      status: "failed",
      error: { kind: "error", message: NOT_CONFIRMED_MESSAGE },
    });
  });

  it("exige seis cifras antes de enviar", () => {
    expect(codeFromDigits(["4", "8", "2", "9", "1", "3"])).toBe(CODE);
    expect(codeFromDigits(["4", "8", "", "9", "1", "3"])).toBeNull();
    expect(verificationError(new ApiError(400, "codigo invalido")).kind).toBe("incomplete_code");
  });

  it("errores de red y de servidor tienen mensajes propios", () => {
    expect(verificationError(new TypeError("Failed to fetch")).kind).toBe("network");
    expect(verificationError(new ApiError(503, "x")).kind).toBe("error");
  });

  it("muestra errores y deshabilita acciones mientras confirma", () => {
    const failed = view({ error: { kind: "invalid_code", message: INVALID_CODE_MESSAGE } });
    expect(failed).toContain(INVALID_CODE_MESSAGE);
    expect(failed).toContain('role="alert"');
    const busy = view({ confirming: true });
    expect(busy).toContain("Verificando...");
    expect(busy).toContain('aria-busy="true"');
  });
});

describe("reingreso, duplicados y seguridad", () => {
  it("10. quien abandona y vuelve encuentra la verificación sin envío automático", () => {
    expect(authStage(base, null)).toBe("verify");
    const html = view({ sent: false });
    expect(html).toContain("Enviar código");
    expect(html).toContain("Cerrar sesión");
  });

  it("11. solicitar o confirmar un código nunca crea otra cuenta", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { ok: true, wait: 300 }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
      .mockResolvedValueOnce(jsonResponse(200, { ...base, email_verified: true }));
    vi.stubGlobal("fetch", fetchMock);
    await requestCode(realApi, SESSION);
    await confirmAndReload(realApi, SESSION, CODE);
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("/api/v1/accounts/"))).toBe(false);
    expect(urls.some((url) => url.includes("/registro"))).toBe(false);
  });

  it("no guarda el código en storage ni lo escribe en la consola", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { error: "codigo invalido" })));
    await confirmAndReload(realApi, SESSION, CODE);
    for (const value of storage.data.values()) expect(value).not.toContain(CODE);
    for (const spy of spies) {
      for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(CODE);
    }
  });
});

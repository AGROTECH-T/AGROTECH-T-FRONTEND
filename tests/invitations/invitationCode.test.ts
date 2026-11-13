/**
 * Pruebas de F10.3.5: unión a una finca con código de invitación.
 *
 * Propósito: contrato de POST /invitations/code/preview/ y /code/accept/,
 * traducción de 400, 401, 403, 404, 409, 429, 5xx y red, una sola solicitud en
 * vuelo, ningún uso de sessionStorage/localStorage para el código, vistas de
 * previsualización y confirmación, la entrada permanente en Fincas y varias
 * fincas con roles distintos.
 * Contexto: entorno node (sin DOM); fetch y almacenamiento simulados; HTML
 * estático con renderToStaticMarkup. Respuestas simuladas con el contrato real
 * del backend (apps/farms/views.py, F10.3.3-B).
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmList } from "../../src/features/farms/components/FarmList.tsx";
import { emptyHint, FarmsScreen } from "../../src/features/farms/components/FarmsScreen.tsx";
import { JOIN_FARM_LABEL } from "../../src/features/farms/services/joinFarm.ts";
import type { Farm } from "../../src/features/farms/types/index.ts";
import {
  InvitationCodeForm,
  InvitationCodeView,
} from "../../src/features/invitations/components/InvitationCodeForm.tsx";
import {
  acceptInvitationCode,
  CODE_ACCEPT_ENDPOINT,
  CODE_PREVIEW_ENDPOINT,
  previewInvitationCode,
} from "../../src/features/invitations/services/codeApi.ts";
import {
  CODE_EMPTY_MESSAGE,
  CODE_INVALID_REQUEST_MESSAGE,
  CODE_NOT_FOUND_MESSAGE,
  CODE_RATE_LIMIT_MESSAGE,
  CODE_SERVER_MESSAGE,
  CODE_SESSION_MESSAGE,
  CODE_UNVERIFIED_MESSAGE,
  codeErrorFrom,
  createCodeRunner,
  joinedMessage,
  normalizeInvitationCode,
  previewSummary,
  type CodeStep,
} from "../../src/features/invitations/services/codeFlow.ts";
import { ALREADY_MEMBER_MESSAGE, NETWORK_MESSAGE } from "../../src/features/invitations/services/acceptFlow.ts";
import type { InvitationAcceptResult, InvitationCodePreview } from "../../src/features/invitations/types/index.ts";

const CODE = "ABCDE-23456";
const SESSION = "sesion-jwe";
const PREVIEW: InvitationCodePreview = {
  farm_name: "El Roble",
  role: "operador",
  expires_at: "2026-11-19T12:00:00Z",
};
const ACCEPTED: InvitationAcceptResult = { farm_id: 12, membership_id: 40, role: "operador", status: "active" };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => (data.has(key) ? (data.get(key) as string) : null)),
    setItem: vi.fn((key: string, value: string) => void data.set(key, value)),
    removeItem: vi.fn((key: string) => void data.delete(key)),
  };
}

function withSession() {
  const session = memoryStorage();
  session.getItem.mockImplementation(() => SESSION);
  const local = memoryStorage();
  vi.stubGlobal("sessionStorage", session);
  vi.stubGlobal("localStorage", local);
  return { session, local };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("contrato HTTP", () => {
  it("preview envía solo el código con la sesión Bearer", async () => {
    withSession();
    const fetchMock = vi.fn(async () => jsonResponse(200, PREVIEW));
    vi.stubGlobal("fetch", fetchMock);
    expect(await previewInvitationCode(CODE)).toEqual(PREVIEW);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url).endsWith(CODE_PREVIEW_ENDPOINT)).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ code: CODE });
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${SESSION}`);
  });

  it("accept envía solo el código y devuelve la membresía", async () => {
    withSession();
    const fetchMock = vi.fn(async () => jsonResponse(200, ACCEPTED));
    vi.stubGlobal("fetch", fetchMock);
    expect(await acceptInvitationCode(CODE)).toEqual(ACCEPTED);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url).endsWith(CODE_ACCEPT_ENDPOINT)).toBe(true);
    expect(JSON.parse(String(init.body))).toEqual({ code: CODE });
  });

  it("un error del backend llega como ApiError con su código", async () => {
    withSession();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(404, { error: "invitación no encontrada" })));
    await expect(previewInvitationCode(CODE)).rejects.toMatchObject({ status: 404 });
  });
});

describe("estados de error", () => {
  const cases: [number, string, string][] = [
    [400, "invalid_request", CODE_INVALID_REQUEST_MESSAGE],
    [401, "session_expired", CODE_SESSION_MESSAGE],
    [403, "unverified", CODE_UNVERIFIED_MESSAGE],
    [404, "not_found", CODE_NOT_FOUND_MESSAGE],
    [409, "already_member", ALREADY_MEMBER_MESSAGE],
    [500, "server", CODE_SERVER_MESSAGE],
    [502, "server", CODE_SERVER_MESSAGE],
  ];
  for (const [status, kind, message] of cases) {
    it(`${status} → ${kind} sin detalles internos`, () => {
      const error = codeErrorFrom(new ApiError(status, `detalle interno ${CODE} stack`));
      expect(error).toEqual({ kind, message });
      expect(error.message).not.toContain(CODE);
      expect(error.message).not.toContain("interno");
    });
  }

  it("429 muestra el aviso de límite del servidor y nada más", () => {
    const limited = codeErrorFrom(new ApiError(429, "Límite de intentos alcanzado. Se restablece en 15 minutos."));
    expect(limited).toEqual({ kind: "rate_limited", message: "Límite de intentos alcanzado. Se restablece en 15 minutos." });
    const odd = codeErrorFrom(new ApiError(429, "texto inesperado"));
    expect(odd).toEqual({ kind: "rate_limited", message: CODE_RATE_LIMIT_MESSAGE });
  });

  it("sin respuesta del servidor → red", () => {
    expect(codeErrorFrom(new TypeError("Failed to fetch"))).toEqual({ kind: "network", message: NETWORK_MESSAGE });
  });
});

describe("ejecutor de una sola solicitud", () => {
  it("normaliza el código y no llama al backend si está vacío", async () => {
    expect(normalizeInvitationCode(" abcde -  23456 ")).toBe("ABCDE-23456");
    const api = { preview: vi.fn(async () => PREVIEW), accept: vi.fn(async () => ACCEPTED) };
    const runner = createCodeRunner(api);
    expect(await runner.preview("   ")).toEqual({ ok: false, error: { kind: "empty", message: CODE_EMPTY_MESSAGE } });
    expect(await runner.accept("")).toMatchObject({ ok: false });
    expect(api.preview).not.toHaveBeenCalled();
    expect(api.accept).not.toHaveBeenCalled();
    await runner.preview(" abcde-23456 ");
    expect(api.preview).toHaveBeenCalledWith("ABCDE-23456");
  });

  it("doble clic en preview y en aceptar: una sola petición cada uno", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const api = {
      preview: vi.fn(async () => {
        await gate;
        return PREVIEW;
      }),
      accept: vi.fn(async () => {
        await gate;
        return ACCEPTED;
      }),
    };
    const runner = createCodeRunner(api);
    const first = runner.preview(CODE);
    const second = runner.preview(CODE);
    const acceptA = runner.accept(CODE);
    const acceptB = runner.accept(CODE);
    expect(first).toBe(second);
    expect(acceptA).toBe(acceptB);
    expect(runner.busy()).toBe(true);
    release();
    expect(await first).toEqual({ ok: true, value: PREVIEW });
    expect(await acceptA).toEqual({ ok: true, value: ACCEPTED });
    expect(api.preview).toHaveBeenCalledTimes(1);
    expect(api.accept).toHaveBeenCalledTimes(1);
    expect(runner.busy()).toBe(false);
  });

  it("un fallo se traduce y permite reintentar", async () => {
    const api = {
      preview: vi
        .fn()
        .mockRejectedValueOnce(new ApiError(429, "Límite de intentos alcanzado. Se restablece en 1 minuto."))
        .mockResolvedValueOnce(PREVIEW),
      accept: vi.fn(async () => ACCEPTED),
    };
    const runner = createCodeRunner(api);
    expect(await runner.preview(CODE)).toMatchObject({ ok: false, error: { kind: "rate_limited" } });
    expect(await runner.preview(CODE)).toEqual({ ok: true, value: PREVIEW });
  });

  it("el código nunca se guarda en sessionStorage ni localStorage", async () => {
    const { session, local } = withSession();
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      jsonResponse(200, String(url).endsWith(CODE_PREVIEW_ENDPOINT) ? PREVIEW : ACCEPTED)));
    const runner = createCodeRunner({ preview: previewInvitationCode, accept: acceptInvitationCode });
    await runner.preview(CODE);
    await runner.accept(CODE);
    renderToStaticMarkup(createElement(InvitationCodeForm, { title: "Unirme", onAccepted: () => undefined }));
    expect(session.setItem).not.toHaveBeenCalled();
    expect(local.setItem).not.toHaveBeenCalled();
  });
});

describe("vistas", () => {
  const noop = () => undefined;
  function render(step: CodeStep, overrides: Partial<Parameters<typeof InvitationCodeView>[0]> = {}) {
    return renderToStaticMarkup(
      createElement(InvitationCodeView, {
        title: "Unirme a una finca",
        step,
        code: "",
        preview: null,
        error: null,
        onCodeChange: noop,
        onPreview: noop,
        onConfirm: noop,
        onBack: noop,
        onCancel: noop,
        ...overrides,
      }),
    );
  }

  it("escribir el código: campo y continuar, sin datos de finca", () => {
    const html = render("enter");
    expect(html).toContain('name="invitation-code"');
    expect(html).toContain("Continuar");
    expect(html).not.toContain("data-code-preview");
  });

  it("comprobando: botones deshabilitados (sin doble envío)", () => {
    const html = render("checking", { code: CODE });
    expect(html).toContain("Comprobando...");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Comprobando/);
  });

  it("previsualización: finca, rol y vencimiento, y confirmación explícita", () => {
    const html = render("confirm", { preview: PREVIEW });
    expect(html).toContain('data-field="farm">El Roble');
    expect(html).toContain('data-field="role">Operador');
    expect(html).toContain(`data-field="expires">${previewSummary(PREVIEW).expires}`);
    expect(html).toContain("Unirme a la finca");
    expect(html).toContain("Cambiar código");
    expect(html).not.toContain('name="invitation-code"');
  });

  it("aceptando: no permite repetir la confirmación", () => {
    const html = render("accepting", { preview: PREVIEW });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Uniéndote\.\.\./);
  });

  it("muestra el error sin el código", () => {
    const html = render("enter", { code: CODE, error: codeErrorFrom(new ApiError(404, "x")) });
    expect(html).toContain('data-code-error="not_found"');
    expect(html).toContain(CODE_NOT_FOUND_MESSAGE);
  });

  it("unido: confirmación sin formulario", () => {
    const html = render("joined", { joinedMessage: joinedMessage(PREVIEW, ACCEPTED) });
    expect(html).toContain("Te uniste a «El Roble» como Operador.");
    expect(html).not.toContain("Continuar");
  });
});

describe("Fincas y varias membresías", () => {
  const farm = (id: number, name: string, role: Farm["role"]): Farm => ({
    id,
    name,
    role,
    created_at: "2026-11-12T08:00:00Z",
    updated_at: "2026-11-12T08:00:00Z",
    is_active: true,
    deactivated_at: null,
  });

  it("«Unirme a una finca» está siempre disponible, también sin poder crear fincas", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    vi.stubGlobal("sessionStorage", memoryStorage());
    const withoutCapabilities = renderToStaticMarkup(
      createElement(FarmsScreen, {
        account: { can_create_farms: false, can_create_first_farm: false, can_open_inactive_farms: false },
      }),
    );
    expect(withoutCapabilities).toContain(`data-action="join-farm"`);
    expect(withoutCapabilities).toContain(JOIN_FARM_LABEL);
    const admin = renderToStaticMarkup(
      createElement(FarmsScreen, {
        account: { can_create_farms: true, can_create_first_farm: false, can_open_inactive_farms: true },
      }),
    );
    expect(admin).toContain(JOIN_FARM_LABEL);
  });

  it("el estado vacío orienta hacia el código de invitación", () => {
    expect(emptyHint(true, false)).toContain(JOIN_FARM_LABEL);
    expect(emptyHint(true, true)).toContain("Nueva finca");
  });

  it("la lista muestra cada finca con su propio rol (administrador, operador y consulta)", () => {
    const html = renderToStaticMarkup(
      createElement(FarmList, {
        farms: [farm(1, "Propia", "administrador"), farm(2, "Vecina", "operador"), farm(3, "Lejana", "consulta")],
        onSelect: () => undefined,
      }),
    );
    for (const text of ["Propia", "Vecina", "Lejana", "Administrador", "Operador", "Consulta"]) {
      expect(html).toContain(text);
    }
  });

  it("los tres roles se presentan en la previsualización y la confirmación", () => {
    for (const [role, label] of [["administrador", "Administrador"], ["operador", "Operador"], ["consulta", "Consulta"]]) {
      expect(previewSummary({ ...PREVIEW, role }).role).toBe(label);
      expect(joinedMessage({ ...PREVIEW, role }, { ...ACCEPTED, role })).toContain(label);
    }
  });
});

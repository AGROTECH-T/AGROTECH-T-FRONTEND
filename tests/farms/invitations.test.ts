/**
 * Pruebas de creación y listado de invitaciones (F3.1).
 *
 * Propósito: crear, listar, validar el formulario, roles válidos, estados de
 * entrega, vencimiento, 502 con invitation_id, errores 400/403/429, carga y
 * bloqueo de doble envío.
 * Contexto: entorno node; HTML estático y fetch simulado o API inyectada.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmInvitations } from "../../src/features/farms/components/FarmInvitations.tsx";
import {
  createdNotice,
  createOutcomeFromError,
  DELIVERY_FAILED_MESSAGE,
  deliveryState,
  expiryInfo,
  INVITATION_ROLES,
  invitationRequest,
  invitationStatusLabel,
  submitInvitation,
  validateInvitationForm,
} from "../../src/features/farms/services/invitations.ts";
import * as invitationsApi from "../../src/features/farms/services/invitationsApi.ts";
import type { FarmInvitation } from "../../src/features/farms/types/index.ts";

const NOW = new Date("2026-11-11T12:00:00-05:00");

function invitation(overrides: Partial<FarmInvitation> = {}): FarmInvitation {
  return {
    id: 12,
    email: "persona@example.com",
    role: "operador",
    status: "pending",
    expires_at: "2026-11-18T12:00:00-05:00",
    last_sent_at: "2026-11-11T12:00:05-05:00",
    delivery_pending: false,
    accepted_at: null,
    cancelled_at: null,
    created_at: "2026-11-11T12:00:00-05:00",
    updated_at: "2026-11-11T12:00:05-05:00",
    ...overrides,
  };
}

describe("validación del formulario y roles", () => {
  it("exige correo y rol", () => {
    expect(validateInvitationForm("", null)).toEqual({
      email: "Escribe el correo de la persona invitada.",
      role: "Elige el rol de la invitación.",
    });
  });

  it("rechaza correos mal formados o demasiado largos", () => {
    expect(validateInvitationForm("persona", "operador").email).toBe("Escribe un correo válido.");
    expect(validateInvitationForm("a@b", "operador").email).toBe("Escribe un correo válido.");
    expect(validateInvitationForm(`${"a".repeat(250)}@x.co`, "operador").email).toContain("254");
  });

  it("acepta un correo y un rol válidos", () => {
    expect(validateInvitationForm("  persona@example.com ", "consulta")).toEqual({});
  });

  it("solo admite los tres roles del backend", () => {
    expect(INVITATION_ROLES).toEqual(["administrador", "operador", "consulta"]);
    expect(validateInvitationForm("a@b.co", "jefe" as never).role).toBe(
      "Elige el rol de la invitación.",
    );
  });

  it("el cuerpo del POST tiene solo email (recortado) y role", () => {
    expect(invitationRequest("  persona@example.com ", "operador")).toEqual({
      email: "persona@example.com",
      role: "operador",
    });
  });
});

describe("estados de la invitación y de entrega", () => {
  it("etiquetas iguales a las del backend", () => {
    expect(invitationStatusLabel("pending")).toBe("Pendiente");
    expect(invitationStatusLabel("accepted")).toBe("Aceptada");
    expect(invitationStatusLabel("cancelled")).toBe("Cancelada");
    expect(invitationStatusLabel("expired")).toBe("Expirada");
  });

  it("delivery_pending=true es 'Envío sin confirmar'", () => {
    expect(deliveryState(invitation({ delivery_pending: true, last_sent_at: null }))).toEqual({
      kind: "unconfirmed",
      label: "Envío sin confirmar",
    });
  });

  it("delivery_pending=false sin last_sent_at es 'No entregada'", () => {
    expect(deliveryState(invitation({ last_sent_at: null })).kind).toBe("failed");
  });

  it("delivery_pending=false con last_sent_at es 'Enviada' con su fecha", () => {
    expect(deliveryState(invitation())).toEqual({
      kind: "sent",
      label: "Enviada",
      sentAt: "2026-11-11T12:00:05-05:00",
    });
  });

  it("no se deriva entrega para invitaciones que ya no están pendientes", () => {
    for (const status of ["accepted", "cancelled", "expired"] as const) {
      expect(deliveryState(invitation({ status, last_sent_at: null })).kind).toBe("none");
    }
  });
});

describe("vencimiento", () => {
  it("días, horas y menos de una hora", () => {
    expect(expiryInfo("2026-11-18T12:00:00-05:00", NOW)).toEqual({
      expired: false,
      label: "Vence en 7 días",
    });
    expect(expiryInfo("2026-11-12T13:00:00-05:00", NOW).label).toBe("Vence en 1 día");
    expect(expiryInfo("2026-11-11T17:00:00-05:00", NOW).label).toBe("Vence en 5 horas");
    expect(expiryInfo("2026-11-11T12:30:00-05:00", NOW).label).toBe("Vence en menos de una hora");
  });

  it("una fecha pasada o igual es vencida", () => {
    expect(expiryInfo("2026-11-11T12:00:00-05:00", NOW)).toEqual({ expired: true, label: "Vencida" });
    expect(expiryInfo("2026-11-01T12:00:00-05:00", NOW).expired).toBe(true);
  });

  it("una fecha inválida no se presenta como vencida", () => {
    expect(expiryInfo("x", NOW)).toEqual({ expired: false, label: "Vencimiento desconocido" });
  });
});

describe("crear invitación", () => {
  it("éxito: devuelve la invitación del backend", async () => {
    const create = vi.fn(async () => invitation());
    const outcome = await submitInvitation(create, 2, { email: "persona@example.com", role: "operador" });
    expect(create).toHaveBeenCalledWith(2, { email: "persona@example.com", role: "operador" });
    expect(outcome).toEqual({ status: "created", invitation: invitation() });
  });

  it("502 con invitation_id: la invitación quedó creada sin correo", () => {
    const outcome = createOutcomeFromError(
      new ApiError(502, "no se pudo entregar la invitación", { invitation_id: 12 }),
    );
    expect(outcome).toEqual({
      status: "created_without_email",
      invitationId: 12,
      message: "La invitación quedó creada, pero el correo no pudo enviarse.",
    });
    expect(DELIVERY_FAILED_MESSAGE).toBe(
      "La invitación quedó creada, pero el correo no pudo enviarse.",
    );
  });

  it("502 sin invitation_id conserva el mensaje y deja el id en null", () => {
    expect(createOutcomeFromError(new ApiError(502, "x"))).toMatchObject({
      status: "created_without_email",
      invitationId: null,
    });
  });

  it("400, 403, 409 y 429 muestran el mensaje del backend", () => {
    const cases: [number, string][] = [
      [400, "Introduzca una dirección de correo electrónico válida."],
      [403, "solo el administrador puede hacer este cambio"],
      [409, "ya existe una invitación vigente para este correo"],
      [429, "Límite de intentos alcanzado. Se restablece en 20 minutos."],
    ];
    for (const [status, message] of cases) {
      expect(createOutcomeFromError(new ApiError(status, message))).toEqual({
        status: "error",
        httpStatus: status,
        message,
      });
    }
  });

  it("el aviso de éxito no afirma una entrega que no se confirmó", () => {
    expect(createdNotice(invitation())).toBe("Invitación enviada a persona@example.com.");
    expect(createdNotice(invitation({ delivery_pending: true, last_sent_at: null }))).toBe(
      "Invitación creada para persona@example.com. El envío del correo aún no está confirmado.",
    );
  });

  it("bloqueo de doble envío: un segundo envío en curso se ignora", async () => {
    let calls = 0;
    let release: (value: FarmInvitation) => void = () => undefined;
    const create = () =>
      new Promise<FarmInvitation>((resolve) => {
        calls += 1;
        release = resolve;
      });
    const run = createSubmitGuard();
    const request = { email: "persona@example.com", role: "operador" as const };
    const first = run(async () => {
      await submitInvitation(create, 2, request);
    });
    expect(
      await run(async () => {
        await submitInvitation(create, 2, request);
      }),
    ).toBe(false);
    release(invitation());
    expect(await first).toBe(true);
    expect(calls).toBe(1);
  });
});

function render(props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(FarmInvitations, { farmId: 2, now: NOW, initialInvitations: [], ...props }),
  );
}

describe("FarmInvitations: formulario", () => {
  it("muestra correo y los tres roles sin ninguno preseleccionado", () => {
    const html = render();
    expect(html).toContain('type="email"');
    expect(html.match(/role="radio"/g)?.length).toBe(3);
    expect(html).not.toContain('aria-checked="true"');
    expect(html).toContain("Enviar invitación");
  });

  it("la confirmación describe destinatario, rol y vigencia", () => {
    const html = render({
      initialEmail: "persona@example.com",
      initialRole: "consulta",
      initialConfirmOpen: true,
    });
    expect(html).toContain("<dialog");
    expect(html).toContain("¿Enviar invitación a persona@example.com?");
    expect(html).toContain("Se invitará con el rol Consulta. El enlace vence en 7 días.");
    expect(html).toContain("no concede permisos operativos automáticamente");
  });

  it("en carga: campos y botones deshabilitados y texto de envío", () => {
    const html = render({
      initialEmail: "persona@example.com",
      initialRole: "operador",
      initialConfirmOpen: true,
      initialSubmitting: true,
    });
    expect(html).toMatch(/<input[^>]*type="email"[^>]*disabled=""/);
    expect(html).toContain("Enviando...");
    expect(html).toContain('aria-busy="true"');
  });

  it("aviso del 502 con su identificador, sin afirmar envío", () => {
    const html = render({
      initialDeliveryWarning: { invitationId: 12, message: DELIVERY_FAILED_MESSAGE },
      initialInvitations: [invitation({ last_sent_at: null })],
    });
    expect(html).toContain("La invitación quedó creada, pero el correo no pudo enviarse.");
    expect(html).toContain("identificador 12");
    expect(html).toContain("No entregada");
    expect(html).toContain("is-highlighted");
    expect(html).not.toContain(">Enviada<");
  });
});

describe("FarmInvitations: listado", () => {
  it("muestra correo, rol, estado, vencimiento, último envío y entrega", () => {
    const html = render({ initialInvitations: [invitation()] });
    expect(html).toContain('data-invitation-id="12"');
    expect(html).toContain("persona@example.com");
    expect(html).toContain("Operador");
    expect(html).toContain('farm-invitation-status is-pending">Pendiente');
    expect(html).toContain("Vence en 7 días");
    expect(html).toContain('farm-invitation-delivery is-sent">Enviada');
  });

  it("estados aceptada, cancelada y expirada con sus fechas reales", () => {
    const html = render({
      initialInvitations: [
        invitation({ id: 1, status: "accepted", accepted_at: "2026-11-12T10:00:00-05:00" }),
        invitation({ id: 2, status: "cancelled", cancelled_at: "2026-11-12T11:00:00-05:00" }),
        invitation({ id: 3, status: "expired", last_sent_at: null }),
      ],
    });
    expect(html).toContain("is-accepted\">Aceptada");
    expect(html).toContain("is-cancelled\">Cancelada");
    expect(html).toContain("is-expired\">Expirada");
    expect(html).toContain("Venció");
    expect(html).not.toContain("Vence en");
    expect(html).not.toContain("No entregada");
    expect(html).not.toContain("Envío sin confirmar");
  });

  it("envío sin confirmar", () => {
    const html = render({
      initialInvitations: [invitation({ delivery_pending: true, last_sent_at: null })],
    });
    expect(html).toContain("Envío sin confirmar");
  });

  it("listado vacío", () => {
    expect(render()).toContain("Aún no hay invitaciones en esta finca.");
  });
});

describe("invitationsApi contra fetch simulado", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", { getItem: () => "tok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(status: number, body: unknown) {
    const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("listInvitations hace GET a /farms/{id}/invitations/ y devuelve el arreglo", async () => {
    const fn = stubFetch(200, [invitation()]);
    const result = await invitationsApi.listInvitations(2);
    expect(result).toHaveLength(1);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/invitations/")).toBe(true);
    expect(init.method).toBe("GET");
  });

  it("createInvitation hace POST solo con email y role", async () => {
    const fn = stubFetch(201, invitation());
    await invitationsApi.createInvitation(2, {
      email: "persona@example.com",
      role: "operador",
      extra: "x",
    } as never);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/invitations/")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ email: "persona@example.com", role: "operador" });
  });

  it("un 502 llega como ApiError con invitation_id y se interpreta como creada", async () => {
    stubFetch(502, { error: "no se pudo entregar la invitación", invitation_id: 12 });
    const outcome = await submitInvitation(invitationsApi.createInvitation, 2, {
      email: "persona@example.com",
      role: "operador",
    });
    expect(outcome).toMatchObject({ status: "created_without_email", invitationId: 12 });
  });

  it("un 403 del listado llega como ApiError", async () => {
    stubFetch(403, { error: "solo el administrador puede hacer este cambio" });
    await expect(invitationsApi.listInvitations(2)).rejects.toMatchObject({ status: 403 });
  });

  it("un 429 de la creación conserva el aviso del backend", async () => {
    stubFetch(429, { error: "Límite de intentos alcanzado. Se restablece en 20 minutos." });
    const outcome = await submitInvitation(invitationsApi.createInvitation, 2, {
      email: "persona@example.com",
      role: "operador",
    });
    expect(outcome).toEqual({
      status: "error",
      httpStatus: 429,
      message: "Límite de intentos alcanzado. Se restablece en 20 minutos.",
    });
  });
});

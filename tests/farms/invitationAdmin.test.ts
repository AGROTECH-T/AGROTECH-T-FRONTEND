/**
 * Pruebas de la administración de invitaciones (F9).
 *
 * Propósito: reenvío, cambio de rol y cancelación: visibilidad según
 * can_manage_invitations, catálogo de roles, confirmación y cancelación de
 * diálogos, doble envío, 502, actualización del listado, errores
 * 401/403/404/409/429/red y ausencia de tokens en el cliente.
 * Contexto: entorno node, sin DOM. Los componentes se renderizan a HTML
 * estático; los flujos se prueban con el reducer y las funciones que usa el
 * componente, con APIs inyectadas o fetch simulado. No se prueban clics reales.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import { FarmInvitations } from "../../src/features/farms/components/FarmInvitations.tsx";
import { unconfirmedAccessView } from "../../src/features/farms/services/capabilityGuards.ts";
import {
  canAdministerInvitation,
  canManageInvitations,
  canStartInvitationAction,
  cancelCopy,
  cancelledNotice,
  INITIAL_INVITATION_ACTION,
  invitationActionReducer,
  invitationFailure,
  invitationRoleCopy,
  loadRoleOptions,
  replaceInvitation,
  resendCopy,
  roleName,
  roleOptionsFromCatalog,
  sentNotice,
  submitCancel,
  submitInvitationRole,
  submitResend,
  withDeliveryFailures,
  type InvitationActionState,
  type InvitationDialog,
  type RoleOption,
} from "../../src/features/farms/services/invitationAdmin.ts";
import { deliveryState } from "../../src/features/farms/services/invitations.ts";
import * as invitationsApi from "../../src/features/farms/services/invitationsApi.ts";
import type {
  Farm,
  FarmCapabilities,
  FarmInvitation,
  FarmRole,
} from "../../src/features/farms/types/index.ts";

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

/** Catálogo como lo devuelve GET /api/v1/configuracion/roles-permisos/. */
const CATALOG_ROLES = [
  { id: "administrador", nombre: "Administrador de finca", resumen: "", funciones: [] },
  { id: "operador", nombre: "Operador", resumen: "", funciones: [] },
  { id: "consulta", nombre: "Consulta", resumen: "", funciones: [] },
];

const OPTIONS: RoleOption[] = roleOptionsFromCatalog(CATALOG_ROLES);

function caps(overrides: Partial<FarmCapabilities> = {}): FarmCapabilities {
  return {
    can_edit_farm: true,
    can_deactivate_farm: true,
    can_reactivate_farm: false,
    can_view_history: true,
    can_manage_members: true,
    can_manage_invitations: true,
    can_read_inventory: true,
    can_write_inventory: true,
    ...overrides,
  };
}

function farm(role: FarmRole, capabilities?: FarmCapabilities): Farm {
  return {
    id: 2,
    name: "Finca de prueba",
    role,
    created_at: "2026-10-01T08:00:00-05:00",
    updated_at: "2026-11-02T09:30:00-05:00",
    is_active: true,
    deactivated_at: null,
    capabilities,
  };
}

function render(props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(FarmInvitations, {
      farmId: 2,
      now: NOW,
      initialInvitations: [invitation()],
      ...props,
    }),
  );
}

const opened = (dialog: InvitationDialog): InvitationActionState =>
  invitationActionReducer(INITIAL_INVITATION_ACTION, { type: "open", dialog });

const RESEND: InvitationDialog = { action: "resend", invitationId: 12 };
const CANCEL: InvitationDialog = { action: "cancel", invitationId: 12 };
const ROLE: InvitationDialog = { action: "role", invitationId: 12, role: "consulta" };

// ---------------------------------------------------------------------------
// Permisos y visibilidad
// ---------------------------------------------------------------------------

describe("permisos: can_manage_invitations", () => {
  it("usa la capacidad del backend, no el rol", () => {
    expect(canManageInvitations(farm("administrador", caps()))).toBe(true);
    expect(
      canManageInvitations(farm("administrador", caps({ can_manage_invitations: false }))),
    ).toBe(false);
  });

  it("sin capacidades aplica la regla del servicio (administrador en finca activa)", () => {
    expect(canManageInvitations(farm("administrador"))).toBe(true);
    expect(canManageInvitations(farm("operador"))).toBe(false);
    expect(canManageInvitations({ ...farm("administrador"), is_active: false })).toBe(false);
  });

  it("con el acceso sin confirmar no se concede", () => {
    expect(canManageInvitations(unconfirmedAccessView(farm("administrador", caps())))).toBe(
      false,
    );
  });

  it("con la capacidad confirmada se ofrecen las tres acciones en una invitación pendiente", () => {
    const html = render({ canManage: true });
    expect(html).toContain('data-action="resend"');
    expect(html).toContain('data-action="role"');
    expect(html).toContain('data-action="cancel"');
  });

  it("sin la capacidad (ausente o falsa) no se ofrece ninguna", () => {
    for (const html of [render(), render({ canManage: false })]) {
      expect(html).not.toContain('data-action="resend"');
      expect(html).not.toContain('data-action="role"');
      expect(html).not.toContain('data-action="cancel"');
    }
  });

  it("solo una invitación pendiente admite acciones", () => {
    for (const status of ["accepted", "cancelled", "expired"] as const) {
      expect(canAdministerInvitation({ status })).toBe(false);
      const html = render({ canManage: true, initialInvitations: [invitation({ status })] });
      expect(html).not.toContain('data-action="resend"');
    }
    expect(canAdministerInvitation({ status: "pending" })).toBe(true);
  });

  it("FarmDetail no muestra Invitaciones a un operador", () => {
    const html = renderToStaticMarkup(
      createElement(FarmDetail, {
        farm: farm(
          "operador",
          caps({
            can_edit_farm: false,
            can_deactivate_farm: false,
            can_view_history: false,
            can_manage_members: false,
            can_manage_invitations: false,
          }),
        ),
        initialTab: "invitaciones",
        onBack: () => undefined,
        onUpdated: () => undefined,
        onLeft: () => undefined,
      }),
    );
    expect(html).not.toContain("Invitaciones de la finca");
    expect(html).not.toContain('data-action="resend"');
  });
});

// ---------------------------------------------------------------------------
// Catálogo de roles
// ---------------------------------------------------------------------------

describe("catálogo de roles", () => {
  it("toma ids y nombres del catálogo real, en su orden", () => {
    expect(OPTIONS).toEqual([
      { id: "administrador", nombre: "Administrador de finca" },
      { id: "operador", nombre: "Operador" },
      { id: "consulta", nombre: "Consulta" },
    ]);
  });

  it("descarta ids que el contrato de la invitación no acepta", () => {
    expect(
      roleOptionsFromCatalog([...CATALOG_ROLES, { id: "soporte", nombre: "Soporte" }]).map(
        (option) => option.id,
      ),
    ).toEqual(["administrador", "operador", "consulta"]);
  });

  it("un catálogo sin roles utilizables es un error, no una lista inventada", async () => {
    expect(() => roleOptionsFromCatalog([])).toThrow();
    await expect(loadRoleOptions(async () => ({ roles: [] }))).rejects.toThrow();
  });

  it("propaga el fallo de la consulta del catálogo", async () => {
    await expect(
      loadRoleOptions(async () => Promise.reject(new ApiError(401, "credenciales inválidas"))),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("el editor muestra los nombres del catálogo y marca el rol actual", () => {
    const html = render({
      canManage: true,
      initialRoleOptions: OPTIONS,
      initialEditingRoleId: 12,
    });
    expect(html).toContain("Nuevo rol de la invitación");
    expect(html).toContain("Administrador de finca");
    expect(html).toContain("Operador (actual)");
    expect(html).toMatch(/disabled=""[^>]*data-role="operador"|data-role="operador"[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Guardar rol<\/button>/);
  });

  it("el nombre cae en la etiqueta local solo si el catálogo no está cargado", () => {
    expect(roleName(OPTIONS, "administrador")).toBe("Administrador de finca");
    expect(roleName(null, "administrador")).toBe("Administrador");
  });
});

// ---------------------------------------------------------------------------
// Diálogos: confirmación, cancelación y doble envío
// ---------------------------------------------------------------------------

describe("diálogos", () => {
  it("no hay diálogo de administración hasta pedirlo", () => {
    expect(render({ canManage: true })).not.toContain("¿Reenviar");
  });

  it("reenvío: explica el enlace nuevo y la invalidez del anterior", () => {
    const html = render({ canManage: true, initialAction: RESEND });
    expect(html).toContain("¿Reenviar la invitación a persona@example.com?");
    expect(html).toContain("El enlace anterior dejará de funcionar");
    expect(resendCopy(invitation()).confirm).toBe("Reenviar invitación");
  });

  it("cambio de rol: aclara que no modifica a ningún integrante", () => {
    const copy = invitationRoleCopy(invitation(), "consulta", OPTIONS);
    expect(copy.title).toBe("¿Cambiar el rol de la invitación a Consulta?");
    expect(copy.body.join(" ")).toContain("pasará de Operador a Consulta");
    expect(copy.body.join(" ")).toContain("no modifica el rol de ningún integrante");
    const html = render({ canManage: true, initialAction: ROLE, initialRoleOptions: OPTIONS });
    expect(html).toContain("¿Cambiar el rol de la invitación a Consulta?");
  });

  it("cancelación: advierte que el enlace dejará de ser válido", () => {
    const html = render({ canManage: true, initialAction: CANCEL });
    expect(html).toContain("¿Cancelar la invitación a persona@example.com?");
    expect(html).toContain("dejará de ser válido y no podrá aceptarse");
    expect(cancelCopy(invitation()).tone).toBe("warning");
    expect(html).toContain("btn-danger");
  });

  it("cerrar el diálogo no inicia la petición", async () => {
    for (const dialog of [RESEND, ROLE, CANCEL]) {
      const api = {
        resendInvitation: vi.fn(async () => invitation()),
        changeInvitationRole: vi.fn(async () => invitation()),
        cancelInvitation: vi.fn(async () => undefined),
      };
      const state = invitationActionReducer(opened(dialog), { type: "cancel" });
      expect(state.dialog).toBeNull();
      expect(canStartInvitationAction(state)).toBe(false);
      if (canStartInvitationAction(state)) await submitResend(api, 2, 12);
      expect(api.resendInvitation).not.toHaveBeenCalled();
      expect(api.changeInvitationRole).not.toHaveBeenCalled();
      expect(api.cancelInvitation).not.toHaveBeenCalled();
    }
  });

  it("con una petición en curso no se cancela, no se abre otro diálogo ni se reinicia", () => {
    const pending = invitationActionReducer(opened(RESEND), { type: "start" });
    expect(pending.acting).toBe(true);
    expect(invitationActionReducer(pending, { type: "cancel" })).toBe(pending);
    expect(invitationActionReducer(pending, { type: "open", dialog: CANCEL })).toBe(pending);
    expect(invitationActionReducer(pending, { type: "start" })).toBe(pending);
  });

  it("estado de carga: botones deshabilitados y texto de envío", () => {
    const html = render({ canManage: true, initialAction: RESEND, initialActing: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Reenviando...");
    expect(html).toMatch(/class="btn-secondary" disabled="">Volver<\/button>/);
    expect(html).toMatch(/disabled=""[^>]*data-action="resend"|data-action="resend"[^>]*disabled=""/);
  });

  it("dos confirmaciones seguidas envían una sola petición", async () => {
    let release: (value: FarmInvitation) => void = () => undefined;
    const resend = vi.fn(
      () =>
        new Promise<FarmInvitation>((resolve) => {
          release = resolve;
        }),
    );
    const guard = createSubmitGuard();
    const first = guard(async () => {
      await submitResend({ resendInvitation: resend }, 2, 12);
    });
    expect(
      await guard(async () => {
        await submitResend({ resendInvitation: resend }, 2, 12);
      }),
    ).toBe(false);
    release(invitation());
    expect(await first).toBe(true);
    expect(resend).toHaveBeenCalledTimes(1);
  });

  it("el error de la acción se muestra dentro del diálogo", () => {
    const html = render({
      canManage: true,
      initialAction: CANCEL,
      initialActionError: "la invitación ya no está pendiente",
    });
    expect(html).toMatch(/role="alert"[^>]*>la invitación ya no está pendiente/);
  });
});

// ---------------------------------------------------------------------------
// Reenvío
// ---------------------------------------------------------------------------

describe("reenvío", () => {
  it("éxito: usa la invitación devuelta y actualiza su fila", async () => {
    const fresh = invitation({
      expires_at: "2026-11-25T12:00:00-05:00",
      last_sent_at: "2026-11-18T12:00:01-05:00",
    });
    const resend = vi.fn(async () => fresh);
    const outcome = await submitResend({ resendInvitation: resend }, 2, 12);
    expect(resend).toHaveBeenCalledWith(2, 12);
    expect(outcome).toEqual({ status: "ok", invitation: fresh });
    const list = [invitation(), invitation({ id: 13, email: "otra@example.com" })];
    const updated = replaceInvitation(list, fresh);
    expect(updated?.[0]).toBe(fresh);
    expect(updated?.[1]).toBe(list[1]);
    expect(list[0].expires_at).toBe("2026-11-18T12:00:00-05:00");
  });

  it("solo afirma el envío si el backend lo confirmó", () => {
    const sent = sentNotice("resend", invitation(), OPTIONS);
    expect(sent.tone).toBe("ok");
    expect(sent.text).toContain("el anterior ya no funciona");
    const unconfirmed = sentNotice("resend", invitation({ delivery_pending: true }), OPTIONS);
    expect(unconfirmed.tone).toBe("warn");
    expect(unconfirmed.text).toContain("aún no está confirmado");
    expect(unconfirmed.text).not.toContain("aceptado por el proveedor");
  });

  it("502: la invitación sigue pendiente y se puede volver a intentar", async () => {
    const outcome = await submitResend(
      {
        resendInvitation: vi.fn(async () =>
          Promise.reject(
            new ApiError(502, "no se pudo entregar la invitación", { invitation_id: 12 }),
          ),
        ),
      },
      2,
      12,
    );
    expect(outcome.status).toBe("delivery_failed");
    if (outcome.status !== "delivery_failed") return;
    expect(outcome.invitationId).toBe(12);
    expect(outcome.message).toContain("sigue pendiente");
    expect(outcome.message).toContain("puedes volver a reenviarla");
    expect(outcome.message).not.toMatch(/se envió|enviada/i);
  });

  it("tras un 502 la fila no aparece como enviada aunque conserve last_sent_at antiguo", () => {
    const stale = invitation({ delivery_pending: false, last_sent_at: "2026-11-11T12:00:05-05:00" });
    expect(deliveryState(stale).kind).toBe("sent");
    const failed = withDeliveryFailures(new Set(), 12, true);
    expect(deliveryState(stale, failed.has(12)).kind).toBe("failed");
    expect(withDeliveryFailures(failed, 12, false).has(12)).toBe(false);
    const html = render({ initialFailedDelivery: [12], initialInvitations: [stale] });
    expect(html).toContain('farm-invitation-delivery is-failed">No entregada');
  });
});

// ---------------------------------------------------------------------------
// Cambio de rol
// ---------------------------------------------------------------------------

describe("cambio de rol", () => {
  it("éxito: envía el rol elegido y refleja el devuelto", async () => {
    const fresh = invitation({ role: "consulta" });
    const change = vi.fn(async () => fresh);
    const outcome = await submitInvitationRole({ changeInvitationRole: change }, 2, 12, "consulta");
    expect(change).toHaveBeenCalledWith(2, 12, "consulta");
    expect(outcome).toEqual({ status: "ok", invitation: fresh });
    expect(replaceInvitation([invitation()], fresh)?.[0].role).toBe("consulta");
    expect(sentNotice("role", fresh, OPTIONS).text).toContain("ahora es para Consulta");
  });

  it("502: el rol sí cambió pero el correo no salió", async () => {
    const outcome = await submitInvitationRole(
      {
        changeInvitationRole: vi.fn(async () =>
          Promise.reject(
            new ApiError(502, "no se pudo entregar la invitación", { invitation_id: 12 }),
          ),
        ),
      },
      2,
      12,
      "consulta",
    );
    if (outcome.status !== "delivery_failed") throw new Error("se esperaba delivery_failed");
    expect(outcome.message).toContain("El rol cambió");
  });

  it("400 rol no válido: muestra el motivo del backend", async () => {
    const outcome = await submitInvitationRole(
      {
        changeInvitationRole: vi.fn(async () =>
          Promise.reject(new ApiError(400, '"x" no es una elección válida.')),
        ),
      },
      2,
      12,
      "consulta",
    );
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.message).toBe('"x" no es una elección válida.');
    expect(outcome.reload).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cancelación
// ---------------------------------------------------------------------------

describe("cancelación", () => {
  it("éxito: solo se declara con el 204 y el diálogo vuelve al estado inicial", async () => {
    const cancel = vi.fn(async () => undefined);
    expect(await submitCancel({ cancelInvitation: cancel }, 2, 12)).toEqual({ status: "ok" });
    expect(cancel).toHaveBeenCalledWith(2, 12);
    const done = invitationActionReducer(
      invitationActionReducer(opened(CANCEL), { type: "start" }),
      { type: "done" },
    );
    expect(done).toEqual(INITIAL_INVITATION_ACTION);
    expect(cancelledNotice(invitation())).toBe(
      "Invitación a persona@example.com cancelada. Su enlace ya no es válido.",
    );
  });

  it("un fallo no altera el listado: el diálogo conserva el motivo", async () => {
    const outcome = await submitCancel(
      { cancelInvitation: vi.fn(async () => Promise.reject(new ApiError(403, "solo el administrador puede hacer este cambio"))) },
      2,
      12,
    );
    if (outcome.status !== "error") throw new Error("se esperaba error");
    const state = invitationActionReducer(
      invitationActionReducer(opened(CANCEL), { type: "start" }),
      { type: "fail", failure: outcome },
    );
    expect(state.dialog).toEqual(CANCEL);
    expect(state.acting).toBe(false);
    expect(state.error).toContain("solo el administrador");
  });
});

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

describe("errores comunes", () => {
  const actions = ["resend", "role", "cancel"] as const;

  it("401: pide iniciar sesión de nuevo", () => {
    for (const action of actions) {
      expect(invitationFailure(new ApiError(401, "credenciales inválidas"), action).message).toBe(
        "Tu sesión no es válida o venció. Inicia sesión de nuevo.",
      );
    }
  });

  it("403: muestra el motivo y pide releer el acceso", () => {
    const failure = invitationFailure(
      new ApiError(403, "solo el administrador puede hacer este cambio"),
      "resend",
    );
    expect(failure.staleAccess).toBe(true);
    expect(failure.reload).toBe(false);
    expect(failure.message).toContain("solo el administrador puede hacer este cambio");
  });

  it("404: actualiza el listado", () => {
    const failure = invitationFailure(new ApiError(404, "invitación no encontrada"), "cancel");
    expect(failure.reload).toBe(true);
    expect(failure.message).toContain("invitación no encontrada");
  });

  it("409: ya no está pendiente, cierra el diálogo y actualiza el listado", () => {
    const failure = invitationFailure(new ApiError(409, "la invitación ya no está pendiente"), "role");
    expect(failure.reload).toBe(true);
    expect(failure.message).toContain("pudo ser aceptada, cancelada o haber vencido");
    const state = invitationActionReducer(
      invitationActionReducer(opened(ROLE), { type: "start" }),
      { type: "fail", failure },
    );
    expect(state.dialog).toBeNull();
    expect(state.error).toContain("ya no está pendiente");
  });

  it("429: cuota de reenvío", () => {
    expect(invitationFailure(new ApiError(429, "Demasiados intentos"), "resend").message).toContain(
      "Espera un rato",
    );
  });

  it("error de red: no afirma el resultado y actualiza el listado", async () => {
    for (const action of actions) {
      const failure = invitationFailure(new TypeError("Failed to fetch"), action);
      expect(failure.httpStatus).toBeNull();
      expect(failure.reload).toBe(true);
      expect(failure.message).toContain("No se sabe si");
    }
    const outcome = await submitCancel(
      { cancelInvitation: vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))) },
      2,
      12,
    );
    expect(outcome.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// Contrato HTTP y tokens
// ---------------------------------------------------------------------------

describe("invitationsApi contra fetch simulado", () => {
  const setItem = vi.fn();
  const localSet = vi.fn();

  beforeEach(() => {
    setItem.mockClear();
    localSet.mockClear();
    vi.stubGlobal("sessionStorage", { getItem: () => "tok", setItem });
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: localSet });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(status: number, body: unknown) {
    const fn = vi.fn(async () =>
      status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status }),
    );
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  function call(fn: ReturnType<typeof stubFetch>) {
    return fn.mock.calls[0] as unknown as [string, RequestInit];
  }

  it("resendInvitation: POST a .../invitations/{id}/resend/ sin token en el cuerpo", async () => {
    const fn = stubFetch(200, invitation());
    await invitationsApi.resendInvitation(2, 12);
    const [url, init] = call(fn);
    expect(url.endsWith("/api/v1/farms/2/invitations/12/resend/")).toBe(true);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({});
  });

  it("changeInvitationRole: PATCH a .../invitations/{id}/ solo con role", async () => {
    const fn = stubFetch(200, invitation({ role: "consulta" }));
    const result = await invitationsApi.changeInvitationRole(2, 12, "consulta");
    const [url, init] = call(fn);
    expect(url.endsWith("/api/v1/farms/2/invitations/12/")).toBe(true);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({ role: "consulta" });
    expect(result.role).toBe("consulta");
  });

  it("cancelInvitation: DELETE a .../invitations/{id}/ y acepta 204", async () => {
    const fn = stubFetch(204, null);
    await expect(invitationsApi.cancelInvitation(2, 12)).resolves.toBeUndefined();
    const [url, init] = call(fn);
    expect(url.endsWith("/api/v1/farms/2/invitations/12/")).toBe(true);
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("un 502 real del reenvío se interpreta como entrega fallida", async () => {
    stubFetch(502, { error: "no se pudo entregar la invitación", invitation_id: 12 });
    const outcome = await submitResend(invitationsApi, 2, 12);
    expect(outcome).toMatchObject({ status: "delivery_failed", invitationId: 12 });
  });

  it("un 409 real de la cancelación llega como error que relee el listado", async () => {
    stubFetch(409, { error: "la invitación ya no está pendiente" });
    const outcome = await submitCancel(invitationsApi, 2, 12);
    expect(outcome).toMatchObject({ status: "error", httpStatus: 409, reload: true });
  });

  it("el cliente nunca recibe ni guarda tokens tras reenviar o cambiar el rol", async () => {
    stubFetch(200, invitation());
    const resent = await invitationsApi.resendInvitation(2, 12);
    stubFetch(200, invitation({ role: "consulta" }));
    const changed = await invitationsApi.changeInvitationRole(2, 12, "consulta");
    for (const item of [resent, changed]) {
      expect(Object.keys(item)).not.toContain("token");
      expect(Object.keys(item)).not.toContain("token_hash");
    }
    expect(setItem).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
  });
});

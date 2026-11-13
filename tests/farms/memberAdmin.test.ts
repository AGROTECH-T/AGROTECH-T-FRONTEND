/**
 * Pruebas de la administración de integrantes (F8).
 *
 * Propósito: revocación y transferencia de la administración: visibilidad
 * según can_manage_members, confirmación y cancelación, doble envío,
 * petición HTTP, actualización tras el éxito y errores 401/403/404/409/red.
 * Contexto: entorno node, sin DOM. Los componentes se renderizan a HTML
 * estático; los flujos se prueban con el reducer y las funciones que usa el
 * componente, con APIs inyectadas o fetch simulado. Ningún dato es real.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import { FarmMemberDetail } from "../../src/features/farms/components/FarmMemberDetail.tsx";
import { FarmMembers } from "../../src/features/farms/components/FarmMembers.tsx";
import { unconfirmedAccessView } from "../../src/features/farms/services/capabilityGuards.ts";
import * as farmsApi from "../../src/features/farms/services/farmsApi.ts";
import { visibleTabs } from "../../src/features/farms/services/farmTabs.ts";
import {
  actionReducer,
  applyTransfer,
  canManageMembers,
  canRevoke,
  canStartAction,
  INITIAL_ACTION_STATE,
  isTransferEligible,
  memberActionFailure,
  memberChangeNotice,
  reloadMembersPage,
  revokeCopy,
  revokedText,
  submitRevoke,
  submitTransfer,
  transferCandidates,
  transferCopy,
  transferredText,
  type ActionState,
} from "../../src/features/farms/services/memberAdmin.ts";
import { refreshAccess } from "../../src/features/farms/services/roleChange.ts";
import type {
  Farm,
  FarmCapabilities,
  FarmMember,
  FarmMembersResponse,
  FarmRole,
  TransferAdminResponse,
} from "../../src/features/farms/types/index.ts";

function member(id: number, role: FarmRole, overrides: Partial<FarmMember> = {}): FarmMember {
  return {
    id,
    name: "Luis Gómez",
    role,
    status: "active",
    created_at: "2026-10-01T08:00:00-05:00",
    updated_at: "2026-11-02T09:30:00-05:00",
    ...overrides,
  };
}

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

/** Capacidades que calcula el backend para un operador en finca activa. */
const OPERATOR_CAPS = caps({
  can_edit_farm: false,
  can_deactivate_farm: false,
  can_view_history: false,
  can_manage_members: false,
  can_manage_invitations: false,
});

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

function renderMember(target: FarmMember, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(FarmMemberDetail, {
      farmId: 2,
      member: target,
      onBack: () => undefined,
      ...extra,
    }),
  );
}

const page: FarmMembersResponse = {
  count: 4,
  next: null,
  previous: null,
  results: [
    member(10, "administrador", { name: "Ana Ruiz" }),
    member(11, "operador"),
    member(12, "consulta", { name: "Marta Díaz" }),
    member(13, "operador", { name: "Pedro Gil", status: "revoked" }),
  ],
};

function transferResponse(): TransferAdminResponse {
  return {
    previous_admin: member(10, "operador", { name: "Ana Ruiz" }),
    new_admin: member(11, "administrador"),
  };
}

const opened = (dialog: "revoke" | "transfer"): ActionState =>
  actionReducer(INITIAL_ACTION_STATE, { type: "open", dialog });

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------

describe("permisos: can_manage_members", () => {
  it("usa la capacidad del backend cuando existe, no el rol", () => {
    expect(canManageMembers(farm("administrador", caps()))).toBe(true);
    expect(
      canManageMembers(farm("administrador", caps({ can_manage_members: false }))),
    ).toBe(false);
  });

  it("sin capacidades (backend anterior a F6) aplica la regla del servicio", () => {
    expect(canManageMembers(farm("administrador"))).toBe(true);
    expect(canManageMembers(farm("operador"))).toBe(false);
    expect(canManageMembers({ ...farm("administrador"), is_active: false })).toBe(false);
  });

  it("con el acceso sin confirmar no se concede", () => {
    expect(canManageMembers(unconfirmedAccessView(farm("administrador", caps())))).toBe(false);
  });

  it("un operador no ve la pestaña Integrantes ni las acciones", () => {
    const html = renderToStaticMarkup(
      createElement(FarmDetail, {
        farm: farm("operador", OPERATOR_CAPS),
        initialTab: "integrantes",
        onBack: () => undefined,
        onUpdated: () => undefined,
        onLeft: () => undefined,
      }),
    );
    expect(html).not.toContain("Integrantes de la finca");
    expect(html).not.toContain("Revocar acceso");
    expect(html).not.toContain("Transferir administración");
  });

  it("el listado solo anuncia las acciones con la capacidad confirmada", () => {
    const base = { farmId: 2, autoOpen: true, initialData: page };
    expect(
      renderToStaticMarkup(createElement(FarmMembers, { ...base, canManage: true })),
    ).toContain("Abre un integrante para cambiar su rol, transferirle la administración");
    expect(renderToStaticMarkup(createElement(FarmMembers, base))).not.toContain(
      "transferirle la administración",
    );
  });

  it("el detalle abierto desde el listado recibe la capacidad", () => {
    const base = { farmId: 2, autoOpen: true, initialData: page, initialSelectedId: 11 };
    expect(
      renderToStaticMarkup(createElement(FarmMembers, { ...base, canManage: true })),
    ).toContain("Revocar acceso");
    expect(renderToStaticMarkup(createElement(FarmMembers, base))).not.toContain(
      "Revocar acceso",
    );
  });
});

// ---------------------------------------------------------------------------
// Revocación
// ---------------------------------------------------------------------------

describe("revocación: visibilidad", () => {
  it("visible para un usuario autorizado sobre una membresía activa", () => {
    const html = renderMember(member(11, "operador"), { canManage: true });
    expect(html).toContain('data-action="revoke"');
    expect(html).toContain("Revocar acceso");
    expect(html).toContain("Administración del integrante");
  });

  it("oculta para un usuario no autorizado", () => {
    const html = renderMember(member(11, "operador"), { canManage: false });
    expect(html).not.toContain('data-action="revoke"');
    expect(html).not.toContain("Administración del integrante");
  });

  it("oculta para membresías revocadas o abandonadas", () => {
    expect(canRevoke(member(13, "operador", { status: "revoked" }))).toBe(false);
    expect(canRevoke(member(13, "operador", { status: "left" }))).toBe(false);
    const html = renderMember(member(13, "operador", { status: "revoked" }), {
      canManage: true,
    });
    expect(html).not.toContain('data-action="revoke"');
    expect(html).toContain("Solo una membresía activa se puede revocar");
  });

  it("los botones quedan deshabilitados hasta confirmar el integrante con el backend", () => {
    const html = renderMember(member(11, "operador"), { canManage: true });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-action="revoke"|data-action="revoke"[^>]*disabled=""/);
  });
});

describe("revocación: confirmación", () => {
  it("el diálogo no aparece hasta pedirlo", () => {
    expect(renderMember(member(11, "operador"), { canManage: true })).not.toContain("<dialog");
  });

  it("explica que el integrante pierde el acceso", () => {
    const html = renderMember(member(11, "operador"), {
      canManage: true,
      initialDialog: "revoke",
    });
    expect(html).toContain("<dialog");
    expect(html).toContain("¿Revocar el acceso de Luis Gómez?");
    expect(html).toContain("perderá de inmediato el acceso a esta finca");
    expect(html).toContain("Para volver necesitará una nueva invitación.");
    expect(html).toContain("btn-danger");
  });

  it("con un administrador avisa del último administrador y de la auto-revocación", () => {
    const body = revokeCopy(member(10, "administrador")).body.join(" ");
    expect(body).toContain("al menos un administrador activo");
    expect(body).toContain("Abandonar finca");
    expect(revokeCopy(member(11, "operador")).body.join(" ")).not.toContain("Abandonar finca");
  });

  it("cancelar cierra el diálogo y no permite iniciar la petición", async () => {
    const revoke = vi.fn(async () => undefined);
    const state = actionReducer(opened("revoke"), { type: "cancel" });
    expect(state.dialog).toBeNull();
    expect(canStartAction(state)).toBe(false);
    // Así decide el componente: sin diálogo abierto no se llama a la API.
    if (canStartAction(state)) await submitRevoke({ revokeMember: revoke }, 2, 11);
    expect(revoke).not.toHaveBeenCalled();
  });

  it("no se puede cancelar mientras la petición está en curso", () => {
    const pending = actionReducer(opened("revoke"), { type: "start" });
    expect(actionReducer(pending, { type: "cancel" })).toBe(pending);
    expect(actionReducer(pending, { type: "open", dialog: "transfer" })).toBe(pending);
  });
});

describe("revocación: carga y doble envío", () => {
  it("muestra el estado de carga y bloquea los botones", () => {
    const html = renderMember(member(11, "operador"), {
      canManage: true,
      initialDialog: "revoke",
      initialPending: true,
    });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Revocando acceso...");
    // Cancelar y confirmar del diálogo quedan deshabilitados.
    expect(html).toMatch(/class="btn-secondary" disabled="">Cancelar<\/button>/);
    expect(html).toMatch(/class="btn-danger" disabled=""[^>]*>Revocando acceso\.\.\.<\/button>/);
  });

  it("un segundo inicio con una petición pendiente se ignora", () => {
    const pending = actionReducer(opened("revoke"), { type: "start" });
    expect(pending.acting).toBe(true);
    expect(canStartAction(pending)).toBe(false);
    expect(actionReducer(pending, { type: "start" })).toBe(pending);
  });

  it("dos confirmaciones seguidas envían una sola petición", async () => {
    let release: () => void = () => undefined;
    const revoke = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const guard = createSubmitGuard();
    const first = guard(async () => {
      await submitRevoke({ revokeMember: revoke }, 2, 11);
    });
    const second = await guard(async () => {
      await submitRevoke({ revokeMember: revoke }, 2, 11);
    });
    release();
    expect(await first).toBe(true);
    expect(second).toBe(false);
    expect(revoke).toHaveBeenCalledTimes(1);
  });
});

describe("revocación: petición y éxito", () => {
  it("llama a la API con la finca y el id de membresía", async () => {
    const revoke = vi.fn(async () => undefined);
    expect(await submitRevoke({ revokeMember: revoke }, 2, 11)).toEqual({ status: "ok" });
    expect(revoke).toHaveBeenCalledWith(2, 11);
  });

  it("tras el 204 se cierra el diálogo y se vuelve a pedir la página con los mismos filtros", async () => {
    expect(actionReducer(actionReducer(opened("revoke"), { type: "start" }), { type: "done" }))
      .toEqual(INITIAL_ACTION_STATE);
    const fresh: FarmMembersResponse = { ...page, count: 3, results: page.results.slice(0, 3) };
    const list = vi.fn(async () => fresh);
    const result = await reloadMembersPage(list, 2, { page: 1, status: "active", query: "luis" }, 20);
    expect(list).toHaveBeenCalledWith(2, "active", "luis", 1, 20);
    expect(result).toEqual({ data: fresh, page: 1 });
  });

  it("si la página quedó vacía se pide la anterior", async () => {
    const empty: FarmMembersResponse = { count: 20, next: null, previous: "p1", results: [] };
    const list = vi.fn(async (_f: number, _s: string, _q: string, p: number) =>
      p === 2 ? empty : page,
    );
    const result = await reloadMembersPage(list, 2, { page: 2, status: "active", query: "" }, 20);
    expect(list).toHaveBeenNthCalledWith(2, 2, "active", "", 1, 20);
    expect(result.page).toBe(1);
    expect(result.data).toBe(page);
  });

  it("la notificación usa el nombre y respeta el acceso releído", () => {
    const text = revokedText(member(11, "operador"));
    expect(text).toBe("Luis Gómez ya no tiene acceso a la finca.");
    const ok = memberChangeNotice(text, {
      status: "ok",
      farm: farm("administrador", caps()),
      lostAdmin: false,
    });
    expect(ok).toEqual({ tone: "ok", text });
    const pending = memberChangeNotice(text, { status: "pending", error: "x" });
    expect(pending.tone).toBe("warn");
    expect(pending.text).toContain("quedan ocultas hasta actualizarlo");
  });
});

describe("revocación: errores", () => {
  async function failWith(cause: unknown) {
    return submitRevoke({ revokeMember: vi.fn(async () => Promise.reject(cause)) }, 2, 11);
  }

  it("403: muestra el motivo y pide releer el acceso", async () => {
    const outcome = await failWith(
      new ApiError(403, "solo el administrador puede hacer este cambio"),
    );
    expect(outcome.status).toBe("error");
    if (outcome.status !== "error") return;
    expect(outcome.httpStatus).toBe(403);
    expect(outcome.message).toContain("solo el administrador puede hacer este cambio");
    expect(outcome.staleAccess).toBe(true);
    expect(outcome.reload).toBe(false);
  });

  it("409 último administrador: mensaje claro y sin cambios locales", async () => {
    const outcome = await failWith(
      new ApiError(409, "la finca debe conservar al menos un administrador"),
    );
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.message).toBe(
      "la finca debe conservar al menos un administrador. Promueve antes a otra persona " +
        "a Administrador o transfiere la administración.",
    );
    expect(outcome.reload).toBe(false);
    const state = actionReducer(actionReducer(opened("revoke"), { type: "start" }), {
      type: "fail",
      failure: outcome,
    });
    // El diálogo sigue abierto con el motivo; nada se retiró de la lista.
    expect(state.dialog).toBe("revoke");
    expect(state.acting).toBe(false);
    expect(state.error).toContain("al menos un administrador");
  });

  it("404: cierra el diálogo y vuelve a consultar el integrante", async () => {
    const outcome = await failWith(new ApiError(404, "integrante no encontrado"));
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.reload).toBe(true);
    expect(outcome.message).toContain("integrante no encontrado");
    const state = actionReducer(actionReducer(opened("revoke"), { type: "start" }), {
      type: "fail",
      failure: outcome,
    });
    expect(state.dialog).toBeNull();
    expect(state.error).toContain("integrante no encontrado");
  });

  it("error de red: no se afirma el resultado y se vuelve a consultar", async () => {
    const outcome = await failWith(new TypeError("Failed to fetch"));
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.httpStatus).toBeNull();
    expect(outcome.reload).toBe(true);
    expect(outcome.message).toContain("No se sabe si la revocación se aplicó");
  });

  it("401: pide iniciar sesión de nuevo", async () => {
    const outcome = await failWith(new ApiError(401, "credenciales inválidas"));
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.message).toBe("Tu sesión no es válida o venció. Inicia sesión de nuevo.");
  });

  it("400 auto-revocación: remite a Abandonar finca", async () => {
    const outcome = await failWith(new ApiError(400, "no puedes revocarte a ti mismo"));
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.message).toContain("Abandonar finca");
  });

  it("el error se muestra dentro del diálogo", () => {
    const html = renderMember(member(11, "operador"), {
      canManage: true,
      initialDialog: "revoke",
      initialActionError: "la finca debe conservar al menos un administrador",
    });
    expect(html).toMatch(/role="alert"[^>]*>la finca debe conservar al menos un administrador/);
  });
});

// ---------------------------------------------------------------------------
// Transferencia
// ---------------------------------------------------------------------------

describe("transferencia: visibilidad y destinatarios", () => {
  it("visible para un usuario autorizado sobre un integrante elegible", () => {
    for (const role of ["operador", "consulta"] as const) {
      const html = renderMember(member(11, role), { canManage: true });
      expect(html).toContain('data-action="transfer"');
      expect(html).toContain("Transferir administración");
    }
  });

  it("oculta para un usuario no autorizado", () => {
    expect(renderMember(member(11, "operador"))).not.toContain('data-action="transfer"');
  });

  it("no se ofrece a otro administrador ni a membresías inactivas", () => {
    expect(renderMember(member(10, "administrador"), { canManage: true })).not.toContain(
      'data-action="transfer"',
    );
    expect(
      renderMember(member(13, "operador", { status: "left" }), { canManage: true }),
    ).not.toContain('data-action="transfer"');
  });

  it("solo son destinatarios las membresías activas que no administran", () => {
    expect(transferCandidates(page).map((m) => m.id)).toEqual([11, 12]);
    expect(transferCandidates(null)).toEqual([]);
  });

  it("excluye al usuario actual: quien transfiere es administrador y ningún administrador es destinatario", () => {
    // El backend no expone el id de la membresía propia; la regla por rol la
    // excluye sin comparar nombres.
    expect(isTransferEligible(member(10, "administrador"))).toBe(false);
    expect(transferCandidates(page).some((m) => m.role === "administrador")).toBe(false);
  });
});

describe("transferencia: confirmación", () => {
  it("explica que la administración pasa al seleccionado y que la cuenta queda como Operador", () => {
    const html = renderMember(member(11, "consulta"), {
      canManage: true,
      initialDialog: "transfer",
    });
    expect(html).toContain("¿Transferir la administración a Luis Gómez?");
    expect(html).toContain("Luis Gómez pasará de Consulta a Administrador.");
    expect(html).toContain("Tú pasarás a Operador");
    expect(transferCopy(member(11, "consulta")).confirm).toBe("Transferir administración");
  });

  it("cancelar cierra el diálogo sin llamar a la API", async () => {
    const transfer = vi.fn(async () => transferResponse());
    const state = actionReducer(opened("transfer"), { type: "cancel" });
    expect(state.dialog).toBeNull();
    if (canStartAction(state)) await submitTransfer({ transferAdmin: transfer }, 2, 11);
    expect(transfer).not.toHaveBeenCalled();
  });

  it("muestra el estado de carga", () => {
    const html = renderMember(member(11, "operador"), {
      canManage: true,
      initialDialog: "transfer",
      initialPending: true,
    });
    expect(html).toContain("Transfiriendo...");
    expect(html).toContain('aria-busy="true"');
  });

  it("dos confirmaciones seguidas envían una sola petición", async () => {
    let release: (value: TransferAdminResponse) => void = () => undefined;
    const transfer = vi.fn(
      () =>
        new Promise<TransferAdminResponse>((resolve) => {
          release = resolve;
        }),
    );
    const guard = createSubmitGuard();
    const first = guard(async () => {
      await submitTransfer({ transferAdmin: transfer }, 2, 11);
    });
    expect(
      await guard(async () => {
        await submitTransfer({ transferAdmin: transfer }, 2, 11);
      }),
    ).toBe(false);
    release(transferResponse());
    expect(await first).toBe(true);
    expect(transfer).toHaveBeenCalledTimes(1);
  });
});

describe("transferencia: éxito", () => {
  it("devuelve las dos membresías que respondió el backend", async () => {
    const transfer = vi.fn(async () => transferResponse());
    const outcome = await submitTransfer({ transferAdmin: transfer }, 2, 11);
    expect(transfer).toHaveBeenCalledWith(2, 11);
    expect(outcome).toEqual({ status: "ok", result: transferResponse() });
  });

  it("actualiza en el listado los roles del anterior y del nuevo administrador", () => {
    const updated = applyTransfer(page, transferResponse());
    expect(updated?.results.find((m) => m.id === 10)?.role).toBe("operador");
    expect(updated?.results.find((m) => m.id === 11)?.role).toBe("administrador");
    expect(updated?.results.find((m) => m.id === 12)?.role).toBe("consulta");
    expect(page.results[0].role).toBe("administrador");
  });

  it("relee la finca: rol Operador, sin capacidades de gestión y solo Resumen", async () => {
    const getFarm = vi.fn(async () => farm("operador", OPERATOR_CAPS));
    const refresh = await refreshAccess(getFarm, farm("administrador", caps()));
    expect(getFarm).toHaveBeenCalledWith(2);
    if (refresh.status !== "ok") throw new Error("se esperaba ok");
    expect(refresh.lostAdmin).toBe(true);
    expect(canManageMembers(refresh.farm)).toBe(false);
    expect(visibleTabs(refresh.farm).map((t) => t.id)).toEqual(["resumen"]);
    const notice = memberChangeNotice(transferredText(transferResponse()), refresh);
    expect(notice.tone).toBe("warn");
    expect(notice.text).toBe(
      "La administración pasó a Luis Gómez. Tu rol en esta finca ahora es Operador. " +
        "Ya no tienes permisos administrativos.",
    );
  });

  it("si no se puede releer la finca, las opciones de administración se ocultan", async () => {
    const refresh = await refreshAccess(
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
      farm("administrador", caps()),
    );
    expect(refresh.status).toBe("pending");
    expect(canManageMembers(unconfirmedAccessView(farm("administrador", caps())))).toBe(false);
  });
});

describe("transferencia: errores", () => {
  async function failWith(cause: unknown) {
    const outcome = await submitTransfer(
      { transferAdmin: vi.fn(async () => Promise.reject(cause)) },
      2,
      11,
    );
    if (outcome.status !== "error") throw new Error("se esperaba error");
    return outcome;
  }

  it("403 cuenta inactiva del destinatario", async () => {
    const outcome = await failWith(new ApiError(403, "la cuenta no está activa"));
    expect(outcome.message).toBe(
      "la cuenta no está activa. Una cuenta inactiva no puede recibir la administración.",
    );
    expect(outcome.staleAccess).toBe(false);
  });

  it("403 sin permiso: pide releer el acceso y conserva el diálogo", async () => {
    const outcome = await failWith(
      new ApiError(403, "solo el administrador puede hacer este cambio"),
    );
    expect(outcome.staleAccess).toBe(true);
    const state = actionReducer(actionReducer(opened("transfer"), { type: "start" }), {
      type: "fail",
      failure: outcome,
    });
    expect(state.dialog).toBe("transfer");
    expect(state.error).toContain("solo el administrador");
  });

  it("409: muestra el motivo del backend sin alterar nada", async () => {
    const outcome = await failWith(new ApiError(409, "conflicto"));
    expect(outcome.httpStatus).toBe(409);
    expect(outcome.message).toBe("conflicto");
    expect(outcome.reload).toBe(false);
  });

  it("404: vuelve a consultar el integrante", async () => {
    const outcome = await failWith(new ApiError(404, "integrante no encontrado"));
    expect(outcome.reload).toBe(true);
  });

  it("400 ya es administrador: muestra el motivo", async () => {
    const outcome = await failWith(new ApiError(400, "el integrante ya es administrador"));
    expect(outcome.message).toBe("el integrante ya es administrador");
  });

  it("error de red: no se afirma el resultado", async () => {
    const outcome = await failWith(new TypeError("Failed to fetch"));
    expect(outcome.httpStatus).toBeNull();
    expect(outcome.message).toContain("No se sabe si la transferencia se aplicó");
    expect(memberActionFailure(new TypeError("x"), "transfer").reload).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Contrato HTTP
// ---------------------------------------------------------------------------

describe("farmsApi contra fetch simulado", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", { getItem: () => "tok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokeMember hace DELETE a /farms/{id}/members/{mid}/ y acepta 204", async () => {
    const fn = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fn);
    await expect(farmsApi.revokeMember(2, 11)).resolves.toBeUndefined();
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/members/11/")).toBe(true);
    expect(init.method).toBe("DELETE");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({});
  });

  it("revokeMember propaga el 409 del último administrador como ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "la finca debe conservar al menos un administrador" }),
            { status: 409 },
          ),
      ),
    );
    await expect(farmsApi.revokeMember(2, 10)).rejects.toMatchObject({
      status: 409,
      serverMessage: "la finca debe conservar al menos un administrador",
    });
  });

  it("transferAdmin hace POST a /farms/{id}/members/{mid}/transfer/ y devuelve ambos roles", async () => {
    const fn = vi.fn(
      async () => new Response(JSON.stringify(transferResponse()), { status: 200 }),
    );
    vi.stubGlobal("fetch", fn);
    const result = await farmsApi.transferAdmin(2, 11);
    expect(result.new_admin.role).toBe("administrador");
    expect(result.previous_admin.role).toBe("operador");
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/members/11/transfer/")).toBe(true);
    expect(init.method).toBe("POST");
  });

  it("transferAdmin propaga el 403 como ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "la cuenta no está activa" }), { status: 403 }),
      ),
    );
    await expect(farmsApi.transferAdmin(2, 11)).rejects.toMatchObject({ status: 403 });
  });

  it("un fallo de red llega como error distinto de ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
    );
    const outcome = await submitRevoke({ revokeMember: farmsApi.revokeMember }, 2, 11);
    if (outcome.status !== "error") throw new Error("se esperaba error");
    expect(outcome.httpStatus).toBeNull();
  });
});

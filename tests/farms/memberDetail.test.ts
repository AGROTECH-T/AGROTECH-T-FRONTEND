/**
 * Pruebas del detalle e historial de integrantes (F2.1).
 *
 * Propósito: selección por id, apertura y cierre del detalle, datos visibles,
 * carga del historial, vacío, paginación y errores de la API.
 * Contexto: entorno node; los componentes se renderizan a HTML estático y el
 * HTTP se simula con fetch o con una API inyectada.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmMemberDetail } from "../../src/features/farms/components/FarmMemberDetail.tsx";
import { FarmMembers } from "../../src/features/farms/components/FarmMembers.tsx";
import * as farmsApi from "../../src/features/farms/services/farmsApi.ts";
import {
  historyReducer,
  historyView,
  INITIAL_HISTORY,
  type HistoryState,
} from "../../src/features/farms/services/historyState.ts";
import {
  loadMemberDetail,
  loadMemberHistoryPage,
  type MemberDetailApi,
} from "../../src/features/farms/services/memberDetail.ts";
import { findMember } from "../../src/features/farms/services/memberSelection.ts";
import type {
  AuditEvent,
  FarmMember,
  FarmMembersResponse,
  HistoryPage,
} from "../../src/features/farms/types/index.ts";

function member(id: number, name: string, overrides: Partial<FarmMember> = {}): FarmMember {
  return {
    id,
    name,
    role: "operador",
    status: "active",
    created_at: "2026-10-01T08:00:00-05:00",
    updated_at: "2026-11-02T09:30:00-05:00",
    ...overrides,
  };
}

const page: FarmMembersResponse = {
  count: 3,
  next: null,
  previous: null,
  results: [
    member(10, "Luis Gómez"),
    member(11, "Luis Gómez", { role: "consulta", status: "revoked" }),
    member(12, "Marta Díaz", { status: "left" }),
  ],
};

function auditEvent(type: string, label: string): AuditEvent {
  return {
    event_type: type,
    event_type_label: label,
    created_at: "2026-11-05T10:00:00-05:00",
    actor_display: "Ana Ruiz",
    entity_type: "FarmMembership",
    entity_id: "11",
    before_data: { role: "operador" },
    after_data: { role: "consulta" },
    reason: "",
  };
}

function historyPage(
  results: AuditEvent[],
  count = results.length,
  next: string | null = null,
  previous: string | null = null,
): HistoryPage {
  return { count, next, previous, results };
}

describe("selección por id de membresía", () => {
  it("dos integrantes con el mismo nombre se distinguen por id", () => {
    expect(findMember(page, 10)?.role).toBe("operador");
    expect(findMember(page, 11)?.role).toBe("consulta");
  });

  it("un id ausente o sin datos devuelve null", () => {
    expect(findMember(page, 99)).toBeNull();
    expect(findMember(null, 10)).toBeNull();
  });
});

function renderMembers(initialSelectedId?: number) {
  return renderToStaticMarkup(
    createElement(FarmMembers, {
      farmId: 2,
      autoOpen: true,
      initialData: page,
      initialSelectedId,
    }),
  );
}

describe("FarmMembers: listado pulsable", () => {
  it("cada fila es un botón identificado por su id de membresía", () => {
    const html = renderMembers();
    expect(html.match(/class="farm-members__item farm-members__row"/g)?.length).toBe(3);
    expect(html).toContain('data-membership-id="10"');
    expect(html).toContain('data-membership-id="11"');
    expect(html).toContain('data-membership-id="12"');
  });

  it("muestra los estados activo, revocado y abandonado", () => {
    const html = renderMembers();
    expect(html).toContain('farm-member-status is-active">Activa');
    expect(html).toContain('farm-member-status is-revoked">Revocada');
    expect(html).toContain('farm-member-status is-left">Abandonada');
  });

  it("conserva la paginación y los filtros en el listado", () => {
    const html = renderMembers();
    expect(html).toContain("Página 1 de 1");
    expect(html).toContain('aria-label="Filtro de estado"');
  });

  it("con un integrante seleccionado muestra su detalle en lugar del listado", () => {
    const html = renderMembers(11);
    expect(html).toContain("Volver a integrantes");
    expect(html).toContain("Historial del integrante");
    expect(html).not.toContain("farm-members__row");
    expect(html).not.toContain('aria-label="Filtro de estado"');
  });

  it("un id inexistente no abre detalle", () => {
    const html = renderMembers(99);
    expect(html).not.toContain("Volver a integrantes");
    expect(html).toContain("farm-members__row");
  });
});

function renderDetail(target: FarmMember, initialHistory?: HistoryState) {
  return renderToStaticMarkup(
    createElement(FarmMemberDetail, {
      farmId: 2,
      member: target,
      onBack: () => undefined,
      initialHistory,
    }),
  );
}

describe("FarmMemberDetail: datos", () => {
  it("muestra nombre, rol, estado y fechas", () => {
    const html = renderDetail(member(11, "Luis Gómez", { role: "consulta", status: "revoked" }));
    expect(html).toContain("Luis Gómez");
    expect(html).toContain("Consulta");
    expect(html).toContain("Revocada");
    expect(html).toContain("Creada");
    expect(html).toContain("Actualizada");
    expect(html).toContain("Volver a integrantes");
  });

  it("no muestra datos personales", () => {
    const html = renderDetail(member(10, "Luis Gómez"));
    for (const word of ["Correo", "Teléfono", "Identificación"]) {
      expect(html).not.toContain(word);
    }
  });

  // F8: revocar y transferir existen, pero solo con can_manage_members
  // confirmado (prop canManage); sin ella no se ofrecen.
  it("sin capacidad confirmada no ofrece revocar ni transferir", () => {
    const html = renderDetail(member(10, "Luis Gómez"));
    expect(html).not.toContain("Revocar acceso");
    expect(html).not.toContain("Transferir administración");
  });

  it("un integrante sin nombre muestra un texto neutro", () => {
    expect(renderDetail(member(10, ""))).toContain("Integrante sin nombre");
  });
});

describe("FarmMemberDetail: historial", () => {
  const target = member(11, "Luis Gómez");

  it("carga: muestra el estado de carga", () => {
    const html = renderDetail(target, { ...INITIAL_HISTORY, loading: true });
    expect(html).toContain("Cargando historial...");
  });

  it("lista los eventos con su descripción", () => {
    const html = renderDetail(target, {
      page: 1,
      loading: false,
      error: "",
      data: historyPage([auditEvent("member_role_changed", "Rol de integrante cambiado")]),
    });
    expect(html).toContain("Rol de integrante cambiado");
    expect(html).toContain("Rol: Operador → Consulta");
    expect(html).toContain("Ana Ruiz");
  });

  it("historial vacío", () => {
    const html = renderDetail(target, {
      page: 1,
      loading: false,
      error: "",
      data: historyPage([]),
    });
    expect(html).toContain("Este integrante no tiene eventos registrados.");
  });

  it("paginación: página 1 de 2 con Anterior deshabilitado", () => {
    const html = renderDetail(target, {
      page: 1,
      loading: false,
      error: "",
      data: historyPage([auditEvent("member_left", "Integrante abandonó la finca")], 21, "next-url"),
    });
    expect(html).toContain("Página 1 de 2");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Anterior<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Siguiente<\/button>/);
  });

  it("error del backend con opción de reintentar", () => {
    const html = renderDetail(target, {
      ...INITIAL_HISTORY,
      error: "solo el administrador puede hacer este cambio",
    });
    expect(html).toContain("solo el administrador puede hacer este cambio");
    expect(html).toContain("Reintentar");
    expect(html).toContain('role="alert"');
  });
});

describe("historyReducer e historyView", () => {
  it("start → success con lista", () => {
    let state = historyReducer(INITIAL_HISTORY, { type: "start", page: 2 });
    expect(historyView(state, 20).kind).toBe("loading");
    state = historyReducer(state, {
      type: "success",
      page: 2,
      data: historyPage([auditEvent("member_left", "x")], 25, null, "prev"),
    });
    const view = historyView(state, 20);
    expect(view.kind).toBe("list");
    if (view.kind === "list") {
      expect(view.page).toBe(2);
      expect(view.pages).toBe(2);
      expect(view.hasPrevious).toBe(true);
      expect(view.hasNext).toBe(false);
    }
  });

  it("un fallo conserva la página para reintentar", () => {
    const loading = historyReducer(INITIAL_HISTORY, { type: "start", page: 3 });
    const failed = historyReducer(loading, { type: "failure", error: "error" });
    expect(failed.page).toBe(3);
    expect(historyView(failed, 20)).toEqual({ kind: "error", message: "error" });
  });

  it("sin datos ni carga no muestra nada; con lista vacía muestra vacío", () => {
    expect(historyView(INITIAL_HISTORY, 20).kind).toBe("idle");
    const empty = historyReducer(INITIAL_HISTORY, {
      type: "success",
      page: 1,
      data: historyPage([]),
    });
    expect(historyView(empty, 20).kind).toBe("empty");
  });
});

describe("loadMemberDetail: historial solo tras confirmar el integrante", () => {
  function fakeApi(overrides: Partial<MemberDetailApi> = {}) {
    const calls: string[] = [];
    const api: MemberDetailApi = {
      getFarmMember: async (farmId, id) => {
        calls.push(`detail:${farmId}:${id}`);
        return member(id, "Luis Gómez");
      },
      listMemberHistory: async (farmId, id, p, size) => {
        calls.push(`history:${farmId}:${id}:${p}:${size}`);
        return historyPage([]);
      },
      ...overrides,
    };
    return { api, calls };
  }

  it("consulta el detalle y después la primera página del historial", async () => {
    const { api, calls } = fakeApi();
    const result = await loadMemberDetail(api, 2, 11);
    await result.history;
    expect(result.member.id).toBe(11);
    expect(calls).toEqual(["detail:2:11", "history:2:11:1:20"]);
  });

  it("si el detalle falla (404), no consulta el historial", async () => {
    const { api, calls } = fakeApi({
      getFarmMember: async () => {
        throw new ApiError(404, "integrante no encontrado");
      },
    });
    await expect(loadMemberDetail(api, 2, 99)).rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual([]);
  });

  it("las páginas siguientes usan el id del integrante confirmado", async () => {
    const { api, calls } = fakeApi();
    await loadMemberHistoryPage(api, 2, member(11, "x"), 3);
    expect(calls).toEqual(["history:2:11:3:20"]);
  });
});

describe("farmsApi del detalle contra fetch simulado", () => {
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

  it("listMemberHistory pide la ruta verificada con page y page_size", async () => {
    const fn = stubFetch(200, historyPage([]));
    await farmsApi.listMemberHistory(2, 11, 2, 20);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/farms/2/members/11/history/?");
    expect(url).toContain("page=2");
    expect(url).toContain("page_size=20");
    expect(init.method).toBe("GET");
  });

  it("getFarmMember pide /farms/{id}/members/{membership_id}/", async () => {
    const fn = stubFetch(200, member(11, "Luis"));
    const result = await farmsApi.getFarmMember(2, 11);
    expect(result.id).toBe(11);
    const [url] = fn.mock.calls[0] as unknown as [string];
    expect(url.endsWith("/api/v1/farms/2/members/11/")).toBe(true);
  });

  it("getFarmMember propaga 404 y 403 como ApiError", async () => {
    stubFetch(404, { error: "integrante no encontrado" });
    await expect(farmsApi.getFarmMember(2, 99)).rejects.toMatchObject({
      status: 404,
      message: "integrante no encontrado",
    });
    stubFetch(403, { error: "solo el administrador puede hacer este cambio" });
    await expect(farmsApi.getFarmMember(2, 11)).rejects.toMatchObject({ status: 403 });
  });

  it("listMemberHistory propaga el error del backend", async () => {
    stubFetch(403, { error: "solo el administrador puede hacer este cambio" });
    await expect(farmsApi.listMemberHistory(2, 11)).rejects.toMatchObject({ status: 403 });
  });
});

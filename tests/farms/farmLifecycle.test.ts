/**
 * Pruebas del ciclo de vida de fincas (F1).
 *
 * Propósito: reactivar, desactivar sin abandonar el detalle, abandonar,
 * manejo del 409 del último administrador, respuestas 204, acceso a una
 * finca inactiva y visibilidad de acciones según rol y estado.
 * Contexto: entorno node; los componentes se renderizan a HTML estático y el
 * HTTP se simula con fetch o con una API inyectada.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import type { FarmTabId } from "../../src/features/farms/services/farmTabs.ts";
import {
  applyFarmToList,
  canDeactivate,
  canEditName,
  canLeave,
  canReactivate,
  deactivateFarm,
  leaveErrorMessage,
  leaveFarm,
  openByIdErrorMessage,
  parseFarmId,
  reactivateFarm,
  removeFarmFromList,
  type LifecycleApi,
} from "../../src/features/farms/services/farmLifecycle.ts";
import * as farmsApi from "../../src/features/farms/services/farmsApi.ts";
import type { Farm, FarmRole } from "../../src/features/farms/types/index.ts";

const DEACTIVATED_AT = "2026-11-11T09:00:00-05:00";

function farm(role: FarmRole, isActive = true, id = 2, name = "dorado"): Farm {
  return {
    id,
    name,
    role,
    created_at: "2026-10-23T06:48:00-05:00",
    updated_at: "2026-10-23T06:48:00-05:00",
    is_active: isActive,
    deactivated_at: isActive ? null : DEACTIVATED_AT,
  };
}

/** API falsa que registra llamadas y simula el estado del backend. */
function fakeApi(initial: Farm, overrides: Partial<LifecycleApi> = {}) {
  let current = initial;
  const calls: string[] = [];
  const api: LifecycleApi = {
    getFarm: async (id) => {
      calls.push(`get:${id}`);
      return current;
    },
    deleteFarm: async (id) => {
      calls.push(`delete:${id}`);
      current = { ...current, is_active: false, deactivated_at: DEACTIVATED_AT };
    },
    reactivateFarm: async (id) => {
      calls.push(`reactivate:${id}`);
      current = { ...current, is_active: true, deactivated_at: null };
    },
    leaveFarm: async (id) => {
      calls.push(`leave:${id}`);
    },
    ...overrides,
  };
  return { api, calls };
}

describe("visibilidad de acciones según rol y estado", () => {
  it("Reactivar solo para administrador en finca inactiva", () => {
    expect(canReactivate(farm("administrador", false))).toBe(true);
    expect(canReactivate(farm("administrador", true))).toBe(false);
    expect(canReactivate(farm("operador", false))).toBe(false);
    expect(canReactivate(farm("consulta", false))).toBe(false);
  });

  it("Desactivar y editar solo para administrador en finca activa", () => {
    expect(canDeactivate(farm("administrador"))).toBe(true);
    expect(canDeactivate(farm("administrador", false))).toBe(false);
    expect(canDeactivate(farm("operador"))).toBe(false);
    expect(canEditName(farm("administrador"))).toBe(true);
    expect(canEditName(farm("administrador", false))).toBe(false);
  });

  it("Abandonar para cualquier rol, solo con la finca activa", () => {
    expect(canLeave(farm("administrador"))).toBe(true);
    expect(canLeave(farm("operador"))).toBe(true);
    expect(canLeave(farm("consulta"))).toBe(true);
    expect(canLeave(farm("administrador", false))).toBe(false);
  });
});

describe("desactivar sin abandonar el detalle", () => {
  it("devuelve la finca inactiva leída del backend, sin abandonar", async () => {
    const { api, calls } = fakeApi(farm("administrador"));
    const updated = await deactivateFarm(api, farm("administrador"));
    expect(updated.is_active).toBe(false);
    expect(updated.deactivated_at).toBe(DEACTIVATED_AT);
    expect(calls).toEqual(["delete:2", "get:2"]);
  });

  it("si la relectura falla, marca la finca inactiva sin inventar la fecha", async () => {
    const { api } = fakeApi(farm("administrador"), {
      getFarm: async () => {
        throw new ApiError(500, "error");
      },
    });
    const updated = await deactivateFarm(api, farm("administrador"));
    expect(updated.is_active).toBe(false);
    expect(updated.deactivated_at).toBeNull();
  });

  it("si el DELETE falla, propaga el ApiError y no relee", async () => {
    const { api, calls } = fakeApi(farm("operador"), {
      deleteFarm: async () => {
        throw new ApiError(403, "solo el administrador puede hacer este cambio");
      },
    });
    await expect(deactivateFarm(api, farm("operador"))).rejects.toMatchObject({ status: 403 });
    expect(calls).toEqual([]);
  });

  it("el listado pierde la finca inactiva (como GET /farms/) y la recupera al reactivar", () => {
    const list = [farm("administrador", true, 1, "uno"), farm("administrador")];
    const without = applyFarmToList(list, farm("administrador", false));
    expect(without.map((f) => f.id)).toEqual([1]);
    const back = applyFarmToList(without, farm("administrador"));
    expect(back.map((f) => f.id)).toEqual([1, 2]);
  });

  it("applyFarmToList reemplaza una finca activa sin duplicarla y ordena por id", () => {
    const list = [farm("administrador", true, 3, "tres"), farm("administrador", true, 1, "uno")];
    const renamed = { ...farm("administrador", true, 3), name: "nuevo" };
    const result = applyFarmToList(list, renamed);
    expect(result.map((f) => [f.id, f.name])).toEqual([
      [1, "uno"],
      [3, "nuevo"],
    ]);
  });
});

describe("reactivar finca", () => {
  it("llama a reactivate y devuelve la finca activa leída del backend", async () => {
    const { api, calls } = fakeApi(farm("administrador", false));
    const updated = await reactivateFarm(api, farm("administrador", false));
    expect(updated.is_active).toBe(true);
    expect(updated.deactivated_at).toBeNull();
    expect(calls).toEqual(["reactivate:2", "get:2"]);
  });

  it("propaga el 403 si la cuenta no es administradora", async () => {
    const { api } = fakeApi(farm("operador", false), {
      reactivateFarm: async () => {
        throw new ApiError(403, "solo el administrador puede hacer este cambio");
      },
    });
    await expect(reactivateFarm(api, farm("operador", false))).rejects.toMatchObject({
      status: 403,
      message: "solo el administrador puede hacer este cambio",
    });
  });
});

describe("abandonar finca", () => {
  it("resuelve solo cuando el backend acepta", async () => {
    const { api, calls } = fakeApi(farm("operador"));
    await expect(leaveFarm(api, farm("operador"))).resolves.toBeUndefined();
    expect(calls).toEqual(["leave:2"]);
  });

  it("el 409 del último administrador se propaga (no se presenta como éxito)", async () => {
    const conflict = new ApiError(409, "la finca debe conservar al menos un administrador");
    const { api } = fakeApi(farm("administrador"), {
      leaveFarm: async () => {
        throw conflict;
      },
    });
    await expect(leaveFarm(api, farm("administrador"))).rejects.toBe(conflict);
  });

  it("el mensaje del 409 conserva el texto del backend y explica cómo resolverlo", () => {
    const conflict = new ApiError(409, "la finca debe conservar al menos un administrador");
    const message = leaveErrorMessage(conflict, farm("administrador"));
    expect(message).toContain("la finca debe conservar al menos un administrador");
    expect(message).toContain("otra persona debe tener el rol de administrador");
  });

  it("otros errores muestran el mensaje del backend tal cual", () => {
    const notFound = new ApiError(404, "finca no encontrada");
    expect(leaveErrorMessage(notFound, farm("operador"))).toBe("finca no encontrada");
    expect(leaveErrorMessage("x", farm("operador"))).toBe("No se pudo abandonar la finca");
  });

  it("tras abandonar, la finca sale del listado", () => {
    const list = [farm("operador", true, 1), farm("operador")];
    expect(removeFarmFromList(list, 2).map((f) => f.id)).toEqual([1]);
  });
});

describe("acceso a una finca inactiva por identificador", () => {
  it("parseFarmId acepta enteros positivos y rechaza el resto", () => {
    expect(parseFarmId("2")).toBe(2);
    expect(parseFarmId(" 2 ")).toBe(2);
    expect(parseFarmId("0")).toBeNull();
    expect(parseFarmId("-2")).toBeNull();
    expect(parseFarmId("2.5")).toBeNull();
    expect(parseFarmId("dos")).toBeNull();
    expect(parseFarmId("")).toBeNull();
  });

  it("el 404 se explica sin revelar si la finca existe", () => {
    const message = openByIdErrorMessage(new ApiError(404, "No encontrado."));
    expect(message).toContain("No se encontró la finca");
  });

  it("otros errores conservan el mensaje del backend", () => {
    expect(openByIdErrorMessage(new ApiError(429, "Límite alcanzado."))).toBe("Límite alcanzado.");
  });
});

describe("farmsApi contra fetch simulado", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", { getItem: () => "tok" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(status: number, body?: unknown) {
    const fn = vi.fn(
      async () =>
        new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
          status,
        }),
    );
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("reactivateFarm hace POST a /farms/{id}/reactivate/ y acepta el 204", async () => {
    const fn = stubFetch(204);
    await expect(farmsApi.reactivateFarm(2)).resolves.toBeUndefined();
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/reactivate/")).toBe(true);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer tok");
  });

  it("leaveFarm hace POST a /farms/{id}/leave/ y acepta el 204", async () => {
    const fn = stubFetch(204);
    await expect(farmsApi.leaveFarm(2)).resolves.toBeUndefined();
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/leave/")).toBe(true);
    expect(init.method).toBe("POST");
  });

  it("leaveFarm rechaza con ApiError 409 si es el último administrador", async () => {
    stubFetch(409, { error: "la finca debe conservar al menos un administrador" });
    await expect(farmsApi.leaveFarm(2)).rejects.toMatchObject({
      status: 409,
      message: "la finca debe conservar al menos un administrador",
    });
  });

  it("deleteFarm acepta el 204 de la desactivación", async () => {
    stubFetch(204);
    await expect(farmsApi.deleteFarm(2)).resolves.toBeUndefined();
  });

  it("getFarm devuelve una finca inactiva cuando el backend la autoriza", async () => {
    stubFetch(200, farm("administrador", false));
    const result = await farmsApi.getFarm(2);
    expect(result.is_active).toBe(false);
    expect(result.deactivated_at).toBe(DEACTIVATED_AT);
  });

  it("getFarm propaga el 404 si el backend no autoriza la consulta", async () => {
    stubFetch(404, { error: "No encontrado." });
    await expect(farmsApi.getFarm(2)).rejects.toMatchObject({ status: 404 });
  });
});

function renderDetail(f: Farm, initialTab?: FarmTabId) {
  return renderToStaticMarkup(
    createElement(FarmDetail, {
      farm: f,
      initialTab,
      onBack: () => undefined,
      onUpdated: () => undefined,
      onLeft: () => undefined,
    }),
  );
}

describe("FarmDetail: finca activa e inactiva", () => {
  it("administrador en finca inactiva: aviso, Reactivar y sin acciones no permitidas", () => {
    expect(renderDetail(farm("administrador", false))).toContain("Finca desactivada");
    const html = renderDetail(farm("administrador", false), "configuracion");
    expect(html).toContain("Reactivar finca");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain("Desactivar finca");
    expect(html).not.toContain("Abandonar finca");
  });

  it("administrador en finca activa: editar, desactivar y abandonar; sin Reactivar", () => {
    const html = renderDetail(farm("administrador"), "configuracion");
    expect(html).toContain("Editar nombre");
    expect(html).toContain("Desactivar finca");
    expect(html).toContain("Abandonar finca");
    expect(html).not.toContain("Reactivar finca");
    expect(html).not.toContain("Finca desactivada");
  });

  it("operador en finca activa: puede abandonar, no editar ni desactivar", () => {
    const html = renderDetail(farm("operador"), "configuracion");
    expect(html).toContain("Abandonar finca");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain("Desactivar finca");
    expect(html).not.toContain("Reactivar finca");
  });

  it("operador en finca inactiva no ve Reactivar", () => {
    const html = renderDetail(farm("operador", false));
    expect(html).toContain("Finca desactivada");
    expect(html).not.toContain("Reactivar finca");
    expect(html).not.toContain("Configuración");
  });

  it("ninguna acción se ejecuta al renderizar (sin diálogo abierto)", () => {
    expect(renderDetail(farm("administrador", false))).not.toContain("<dialog");
  });
});

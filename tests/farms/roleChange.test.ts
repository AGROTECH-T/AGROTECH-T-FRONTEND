/**
 * Pruebas del cambio de rol de integrantes (F2.2).
 *
 * Propósito: selección de roles, confirmación, doble envío, éxito, errores
 * 403/409, cuenta inactiva, cambio del propio rol, actualización de
 * farm.role, ocultamiento de pestañas, regreso a Resumen y fallo al releer.
 * Contexto: entorno node; HTML estático y APIs inyectadas o fetch simulado.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";
import { ApiError } from "../../src/services/api/client.ts";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import { FarmMemberDetail } from "../../src/features/farms/components/FarmMemberDetail.tsx";
import * as farmsApi from "../../src/features/farms/services/farmsApi.ts";
import { resolveTab, visibleTabs } from "../../src/features/farms/services/farmTabs.ts";
import { replaceMember } from "../../src/features/farms/services/memberSelection.ts";
import {
  accessNotice,
  canChangeRole,
  isRoleChange,
  refreshAccess,
  ROLE_OPTIONS,
  roleChangeCopy,
  roleChangeErrorMessage,
  submitRoleChange,
} from "../../src/features/farms/services/roleChange.ts";
import type { Farm, FarmMember, FarmRole } from "../../src/features/farms/types/index.ts";

function member(role: FarmRole, overrides: Partial<FarmMember> = {}): FarmMember {
  return {
    id: 11,
    name: "Luis Gómez",
    role,
    status: "active",
    created_at: "2026-10-01T08:00:00-05:00",
    updated_at: "2026-11-02T09:30:00-05:00",
    ...overrides,
  };
}

function farm(role: FarmRole): Farm {
  return {
    id: 2,
    name: "dorado",
    role,
    created_at: "2026-10-01T08:00:00-05:00",
    updated_at: "2026-11-02T09:30:00-05:00",
    is_active: true,
    deactivated_at: null,
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

describe("selección de los tres roles", () => {
  it("ofrece exactamente los valores que acepta el backend", () => {
    expect(ROLE_OPTIONS).toEqual(["administrador", "operador", "consulta"]);
  });

  it("muestra un grupo con los tres roles y marca el actual", () => {
    const html = renderMember(member("operador"));
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)?.length).toBe(3);
    expect(html).toMatch(/aria-checked="true"[^>]*data-role="operador"/);
    expect(html).toContain("Operador (actual)");
    expect(html).toContain("Cambiar rol");
  });

  it("marca el rol elegido distinto del actual", () => {
    const html = renderMember(member("operador"), { initialRole: "consulta" });
    expect(html).toMatch(/aria-checked="true"[^>]*data-role="consulta"/);
  });

  it("una membresía revocada o abandonada no ofrece cambio de rol", () => {
    for (const status of ["revoked", "left"] as const) {
      const html = renderMember(member("operador", { status }));
      expect(html).not.toContain('role="radiogroup"');
      expect(html).toContain("Solo se puede cambiar el rol de una membresía activa.");
    }
    expect(canChangeRole(member("operador"))).toBe(true);
    expect(canChangeRole(member("operador", { status: "revoked" }))).toBe(false);
  });

  it("el mismo rol no cuenta como cambio", () => {
    expect(isRoleChange(member("operador"), "operador")).toBe(false);
    expect(isRoleChange(member("operador"), "consulta")).toBe(true);
  });

  it("hasta confirmar el integrante con el backend, las opciones están deshabilitadas", () => {
    const html = renderMember(member("operador"));
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Cambiar rol<\/button>/);
  });
});

describe("confirmación", () => {
  it("promover a administrador advierte de sus consecuencias", () => {
    const copy = roleChangeCopy(member("operador"), "administrador");
    expect(copy.title).toBe("¿Promover a Luis Gómez a Administrador?");
    expect(copy.tone).toBe("warning");
    expect(copy.body.join(" ")).toContain("gestionar a sus integrantes");
  });

  it("degradar a un administrador advierte de la pérdida de acceso y del último admin", () => {
    const copy = roleChangeCopy(member("administrador"), "operador");
    expect(copy.title).toBe("¿Cambiar a Luis Gómez a Operador?");
    expect(copy.tone).toBe("warning");
    const body = copy.body.join(" ");
    expect(body).toContain("perderás de inmediato las opciones de administración");
    expect(body).toContain("al menos un administrador activo");
  });

  it("cambiar entre operador y consulta es una confirmación normal", () => {
    const toConsulta = roleChangeCopy(member("operador"), "consulta");
    expect(toConsulta.tone).toBe("default");
    expect(toConsulta.confirm).toBe("Cambiar a Consulta");
    expect(roleChangeCopy(member("consulta"), "operador").confirm).toBe("Cambiar a Operador");
  });

  it("el diálogo muestra el texto del cambio y el botón de peligro", () => {
    const html = renderMember(member("operador"), {
      initialRole: "administrador",
      initialConfirmOpen: true,
    });
    expect(html).toContain("<dialog");
    expect(html).toContain("¿Promover a Luis Gómez a Administrador?");
    expect(html).toContain('class="btn-danger"');
    expect(html).toContain("Promover a Administrador");
  });
});

describe("bloqueo de doble envío", () => {
  it("un segundo envío mientras el PATCH sigue en curso se ignora", async () => {
    let calls = 0;
    let release: (m: FarmMember) => void = () => undefined;
    const slowPatch = () =>
      new Promise<FarmMember>((resolve) => {
        calls += 1;
        release = resolve;
      });
    const run = createSubmitGuard();
    const first = run(async () => {
      await submitRoleChange(slowPatch, 2, 11, "consulta");
    });
    expect(await run(async () => {
      await submitRoleChange(slowPatch, 2, 11, "consulta");
    })).toBe(false);
    release(member("consulta"));
    expect(await first).toBe(true);
    expect(calls).toBe(1);
  });
});

describe("respuesta del PATCH", () => {
  it("éxito: devuelve la membresía del backend, no el rol elegido", async () => {
    const patch = vi.fn(async () => member("consulta", { updated_at: "2026-11-11T12:00:00-05:00" }));
    const result = await submitRoleChange(patch, 2, 11, "consulta");
    expect(patch).toHaveBeenCalledWith(2, 11, "consulta");
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.member.updated_at).toBe("2026-11-11T12:00:00-05:00");
  });

  it("error 403: muestra el mensaje del backend", async () => {
    const result = await submitRoleChange(
      async () => {
        throw new ApiError(403, "solo el administrador puede hacer este cambio");
      },
      2,
      11,
      "consulta",
    );
    expect(result).toMatchObject({
      status: "error",
      message: "solo el administrador puede hacer este cambio",
    });
  });

  it("error 409 del último administrador conserva el texto y sugiere cómo resolverlo", () => {
    const message = roleChangeErrorMessage(
      new ApiError(409, "la finca debe conservar al menos un administrador"),
      "operador",
    );
    expect(message).toContain("la finca debe conservar al menos un administrador");
    expect(message).toContain("Promueve antes a otra persona a Administrador");
  });

  it("cuenta inactiva al promover: 403 con contexto", () => {
    const message = roleChangeErrorMessage(
      new ApiError(403, "la cuenta no está activa"),
      "administrador",
    );
    expect(message).toBe(
      "la cuenta no está activa. Una cuenta inactiva no puede ser administradora.",
    );
  });

  it("el mismo 403 en otro cambio no añade contexto inventado", () => {
    expect(roleChangeErrorMessage(new ApiError(403, "la cuenta no está activa"), "consulta")).toBe(
      "la cuenta no está activa",
    );
  });

  it("la página cargada refleja la membresía devuelta", () => {
    const pageData = { count: 2, next: null, previous: null, results: [member("operador"), member("consulta", { id: 12 })] };
    const updated = replaceMember(pageData, member("consulta"));
    expect(updated?.results.map((m) => [m.id, m.role])).toEqual([
      [11, "consulta"],
      [12, "consulta"],
    ]);
    expect(replaceMember(null, member("consulta"))).toBeNull();
  });
});

describe("cambio del propio rol y actualización de farm.role", () => {
  it("relee la finca y detecta la pérdida de administración por el rol devuelto", async () => {
    const getFarm = vi.fn(async () => farm("operador"));
    const result = await refreshAccess(getFarm, farm("administrador"));
    expect(getFarm).toHaveBeenCalledWith(2);
    expect(result).toEqual({ status: "ok", farm: farm("operador"), lostAdmin: true });
  });

  it("si el administrador cambió el rol de otra persona, conserva el acceso", async () => {
    const result = await refreshAccess(async () => farm("administrador"), farm("administrador"));
    expect(result).toMatchObject({ status: "ok", lostAdmin: false });
  });

  it("con farm.role degradado se ocultan las pestañas administrativas y se vuelve a Resumen", () => {
    const tabs = visibleTabs(farm("operador"));
    expect(tabs.map((t) => t.id)).toEqual(["resumen"]);
    expect(resolveTab(tabs, "integrantes")).toBe("resumen");
  });

  it("FarmDetail con el rol devuelto (operador) no muestra pestañas ni acciones de admin", () => {
    const html = renderToStaticMarkup(
      createElement(FarmDetail, {
        farm: farm("operador"),
        initialTab: "integrantes",
        onBack: () => undefined,
        onUpdated: () => undefined,
        onLeft: () => undefined,
      }),
    );
    // Solo Resumen y Configuración (abandonar); ninguna pestaña de administración.
    expect(html.match(/role="tab"/g)?.length).toBe(2);
    expect(html).toContain("Tu rol en esta finca: Operador");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain("Integrantes de la finca");
  });

  it("la notificación explica que ya no hay permisos administrativos", () => {
    const notice = accessNotice(member("operador"), {
      status: "ok",
      farm: farm("operador"),
      lostAdmin: true,
    });
    expect(notice.tone).toBe("warn");
    expect(notice.text).toBe(
      "Tu rol en esta finca ahora es Operador. Ya no tienes permisos administrativos.",
    );
  });

  it("si conserva la administración, la notificación confirma el cambio del integrante", () => {
    const notice = accessNotice(member("consulta"), {
      status: "ok",
      farm: farm("administrador"),
      lostAdmin: false,
    });
    expect(notice).toEqual({ tone: "ok", text: "Rol actualizado: Luis Gómez ahora es Consulta." });
  });
});

describe("fallo al releer la finca tras un PATCH exitoso", () => {
  it("no lanza: devuelve un estado pendiente con el error", async () => {
    const result = await refreshAccess(async () => {
      throw new ApiError(503, "servicio no disponible");
    }, farm("administrador"));
    expect(result).toEqual({ status: "pending", error: "servicio no disponible" });
  });

  it("la notificación afirma que el rol sí se actualizó", () => {
    const notice = accessNotice(member("operador"), { status: "pending", error: "x" });
    expect(notice.tone).toBe("warn");
    expect(notice.text).toContain("Rol actualizado: Luis Gómez ahora es Operador.");
    expect(notice.text).toContain("las opciones de administración quedan ocultas");
    expect(notice.text).not.toMatch(/no se pudo cambiar/i);
  });

  it("FarmDetail con acceso pendiente oculta todo lo administrativo y ofrece reintentar", () => {
    const html = renderToStaticMarkup(
      createElement(FarmDetail, {
        farm: farm("administrador"),
        initialTab: "integrantes",
        initialAccessPending: true,
        onBack: () => undefined,
        onUpdated: () => undefined,
        onLeft: () => undefined,
      }),
    );
    // Solo Resumen y Configuración (abandonar); ninguna pestaña de administración.
    expect(html.match(/role="tab"/g)?.length).toBe(2);
    expect(html).toContain("pendiente de confirmar");
    expect(html).toContain("El cambio de rol se guardó");
    expect(html).toContain("Actualizar acceso");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain("Desactivar finca");
    expect(html).not.toContain("Integrantes de la finca");
  });
});

describe("contrato HTTP de changeMemberRole", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hace PATCH a /farms/{id}/members/{membership_id}/ con {role}", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "tok" });
    const fn = vi.fn(async () => new Response(JSON.stringify(member("operador")), { status: 200 }));
    vi.stubGlobal("fetch", fn);
    const result = await farmsApi.changeMemberRole(2, 11, "operador");
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.endsWith("/api/v1/farms/2/members/11/")).toBe(true);
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"role":"operador"}');
    expect(result.role).toBe("operador");
  });

  it("propaga el 409 como ApiError", async () => {
    vi.stubGlobal("sessionStorage", { getItem: () => "tok" });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "la finca debe conservar al menos un administrador" }), {
            status: 409,
          }),
      ),
    );
    await expect(farmsApi.changeMemberRole(2, 11, "operador")).rejects.toMatchObject({
      status: 409,
    });
  });
});

/**
 * Pruebas de las secciones del detalle de finca.
 *
 * Propósito: visibilidad según rol y estado, y FarmDetail con pestaña abierta.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import {
  resolveTab,
  visibleTabs,
  type FarmTabId,
} from "../../src/features/farms/services/farmTabs.ts";
import type { Farm, FarmRole } from "../../src/features/farms/types/index.ts";

function farm(role: FarmRole, isActive = true): Farm {
  return {
    id: 7,
    name: "La Esperanza",
    role,
    created_at: "2026-10-23T06:48:00-05:00",
    updated_at: "2026-10-23T06:48:00-05:00",
    is_active: isActive,
    deactivated_at: isActive ? null : "2026-11-01T10:00:00-05:00",
  };
}

const ids = (f: Farm) => visibleTabs(f).map((tab) => tab.id);

describe("visibleTabs", () => {
  it("administrador en finca activa ve módulos y administración", () => {
    expect(ids(farm("administrador"))).toEqual([
      "inventarios",
      "galpones",
      "integrantes",
      "invitaciones",
      "historial",
    ]);
  });

  it("administrador en finca desactivada conserva módulos e historial", () => {
    expect(ids(farm("administrador", false))).toEqual([
      "inventarios",
      "galpones",
      "historial",
    ]);
  });

  it("operador y consulta ven inventarios y galpones", () => {
    expect(ids(farm("operador"))).toEqual(["inventarios", "galpones"]);
    expect(ids(farm("consulta"))).toEqual(["inventarios", "galpones"]);
  });
});

describe("resolveTab", () => {
  it("conserva la pestaña pedida si está visible", () => {
    expect(resolveTab(visibleTabs(farm("administrador")), "historial")).toBe("historial");
  });

  it("vuelve a la primera si la pestaña no está visible", () => {
    expect(resolveTab(visibleTabs(farm("operador")), "integrantes")).toBe("inventarios");
    expect(resolveTab(visibleTabs(farm("administrador", false)), "invitaciones")).toBe(
      "inventarios",
    );
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
      onOpenInventory: () => undefined,
      onOpenGalpon: () => undefined,
    }),
  );
}

function selectedTab(html: string): string | undefined {
  const match = /aria-selected="true"[^>]*>([^<]+)</.exec(html);
  return match?.[1]?.trim();
}

describe("FarmDetail con pestañas", () => {
  it("abre en Inventarios; la edición vive en Configuración", () => {
    const html = renderDetail(farm("administrador"));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(selectedTab(html)).toBe("Inventarios");
    expect(html).toContain("Inventarios de la finca");
    expect(html).not.toContain("Identificador");
    expect(html).not.toContain("Editar nombre");
    const settings = renderDetail(farm("administrador"), "configuracion");
    expect(selectedTab(settings)).toBe("Configuración");
    expect(settings).toContain("Editar nombre");
    expect(settings).toContain("Desactivar finca");
    expect(settings).not.toContain("Inventarios de la finca");
  });

  it("abre Integrantes al entrar con esa sección pedida", () => {
    const html = renderDetail(farm("administrador"), "integrantes");
    expect(selectedTab(html)).toBe("Integrantes");
    expect(html).toContain('aria-label="Integrantes de la finca"');
    expect(html).not.toContain("Inventarios de la finca");
    expect(html).not.toContain("Editar nombre");
  });

  it("abre Historial al entrar con esa sección pedida", () => {
    const html = renderDetail(farm("administrador"), "historial");
    expect(selectedTab(html)).toBe("Historial");
    expect(html).toContain('aria-label="Historial de la finca"');
    expect(html).not.toContain("Inventarios de la finca");
  });

  it("Invitaciones abre el formulario de invitaciones", () => {
    const html = renderDetail(farm("administrador"), "invitaciones");
    expect(selectedTab(html)).toBe("Invitaciones");
    expect(html).toContain('aria-label="Invitaciones de la finca"');
    expect(html).toContain("Nueva invitación");
    expect(html).not.toContain("Integrantes de la finca");
  });

  it("solo una pestaña queda seleccionada", () => {
    const html = renderDetail(farm("administrador"), "historial");
    expect(html.match(/aria-selected="true"/g)?.length).toBe(1);
  });

  it("un integrante sin rol de administrador solo ve módulos y Configuración", () => {
    const html = renderDetail(farm("operador"), "integrantes");
    expect(selectedTab(html)).toBe("Inventarios");
    expect(html).not.toContain("Integrantes de la finca");
    expect(html).not.toContain("Editar nombre");
    const settings = renderDetail(farm("operador"), "configuracion");
    expect(settings).toContain("Abandonar finca");
    expect(settings).not.toContain("Editar nombre");
  });

  it("en una finca desactivada no se ofrece edición ni Integrantes", () => {
    const html = renderDetail(farm("administrador", false));
    expect(html).toContain("Desactivada");
    expect(html).not.toContain(">Integrantes<");
    expect(html).not.toContain("Editar nombre");
  });

  it("el diálogo de desactivación no se renderiza hasta pedirlo", () => {
    expect(renderDetail(farm("administrador"))).not.toContain("<dialog");
  });
});

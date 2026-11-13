/**
 * Pruebas de las pestañas del detalle de finca.
 *
 * Propósito: visibilidad según rol y estado, navegación por teclado y
 * renderizado de FarmDetail con la pestaña activa.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import {
  resolveTab,
  tabForKey,
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
  it("administrador en finca activa ve las cuatro pestañas en orden", () => {
    expect(ids(farm("administrador"))).toEqual([
      "resumen",
      "integrantes",
      "invitaciones",
      "historial",
    ]);
  });

  it("administrador en finca desactivada ve Resumen e Historial", () => {
    expect(ids(farm("administrador", false))).toEqual(["resumen", "historial"]);
  });

  it("operador y consulta solo ven Resumen", () => {
    expect(ids(farm("operador"))).toEqual(["resumen"]);
    expect(ids(farm("consulta"))).toEqual(["resumen"]);
  });
});

describe("resolveTab", () => {
  it("conserva la pestaña pedida si está visible", () => {
    expect(resolveTab(visibleTabs(farm("administrador")), "historial")).toBe("historial");
  });

  it("vuelve a Resumen si la pestaña no está visible", () => {
    expect(resolveTab(visibleTabs(farm("operador")), "integrantes")).toBe("resumen");
    expect(resolveTab(visibleTabs(farm("administrador", false)), "invitaciones")).toBe(
      "resumen",
    );
  });
});

describe("tabForKey", () => {
  const tabs = visibleTabs(farm("administrador"));

  it("avanza y retrocede con las flechas, de forma circular", () => {
    expect(tabForKey(tabs, "resumen", "ArrowRight")).toBe("integrantes");
    expect(tabForKey(tabs, "historial", "ArrowRight")).toBe("resumen");
    expect(tabForKey(tabs, "resumen", "ArrowLeft")).toBe("historial");
  });

  it("Home y End van a la primera y la última", () => {
    expect(tabForKey(tabs, "invitaciones", "Home")).toBe("resumen");
    expect(tabForKey(tabs, "resumen", "End")).toBe("historial");
  });

  it("otras teclas no navegan", () => {
    expect(tabForKey(tabs, "resumen", "Enter")).toBeNull();
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

function selectedTab(html: string): string | undefined {
  // El botón lleva un ícono SVG decorativo antes del texto.
  const match = /<button[^>]*aria-selected="true"[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)<\/button>/.exec(html);
  return match?.[1];
}

describe("FarmDetail con pestañas", () => {
  it("abre en Resumen de solo lectura; la edición vive en Configuración", () => {
    const html = renderDetail(farm("administrador"));
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)?.length).toBe(5);
    expect(selectedTab(html)).toBe("Resumen");
    expect(html).toContain("Solo lectura");
    expect(html).toContain("Identificador");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain('name="name"');
    const settings = renderDetail(farm("administrador"), "configuracion");
    expect(selectedTab(settings)).toBe("Configuración");
    expect(settings).toContain("Editar nombre");
    expect(settings).toContain("Desactivar finca");
  });

  it("muestra la pestaña Integrantes cuando es la activa", () => {
    const html = renderDetail(farm("administrador"), "integrantes");
    expect(selectedTab(html)).toBe("Integrantes");
    expect(html).toContain('aria-label="Integrantes de la finca"');
    expect(html).not.toContain("Ver integrantes");
    expect(html).not.toContain("Editar nombre");
  });

  it("muestra la pestaña Historial cuando es la activa", () => {
    const html = renderDetail(farm("administrador"), "historial");
    expect(selectedTab(html)).toBe("Historial");
    expect(html).toContain('aria-label="Historial de la finca"');
    expect(html).not.toContain("Ver historial");
  });

  it("Invitaciones muestra el formulario y la sección de invitaciones", () => {
    const html = renderDetail(farm("administrador"), "invitaciones");
    expect(selectedTab(html)).toBe("Invitaciones");
    expect(html).toContain('aria-label="Invitaciones de la finca"');
    expect(html).toContain("Nueva invitación");
  });

  it("solo la pestaña activa tiene tabindex 0", () => {
    const html = renderDetail(farm("administrador"), "historial");
    expect(html.match(/tabindex="0"/g)?.length).toBe(1);
    expect(html.match(/tabindex="-1"/g)?.length).toBe(4);
  });

  it("un integrante sin rol de administrador solo ve Resumen y Configuración", () => {
    const html = renderDetail(farm("operador"), "integrantes");
    expect(html.match(/role="tab"/g)?.length).toBe(2);
    expect(selectedTab(html)).toBe("Resumen");
    expect(html).toContain("Identificador");
    expect(html).not.toContain("Integrantes de la finca");
    expect(html).not.toContain("Editar nombre");
    const settings = renderDetail(farm("operador"), "configuracion");
    expect(settings).toContain("Abandonar finca");
    expect(settings).not.toContain("Editar nombre");
  });

  it("en una finca desactivada no se ofrece edición ni Integrantes", () => {
    const html = renderDetail(farm("administrador", false));
    // Resumen, Historial y Configuración (para reactivar).
    expect(html.match(/role="tab"/g)?.length).toBe(3);
    expect(html).toContain("Desactivada");
    expect(html).not.toContain("Editar nombre");
  });

  it("el diálogo de desactivación no se renderiza hasta pedirlo", () => {
    expect(renderDetail(farm("administrador"))).not.toContain("<dialog");
  });
});

/**
 * Pruebas del Resumen de solo lectura y de la sección Configuración.
 *
 * Contexto: entorno node; HTML estático con renderToStaticMarkup.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FarmOverview,
  initials,
  invitationStats,
} from "../../src/features/farms/components/FarmOverview.tsx";
import { detailTabs, visibleTabs } from "../../src/features/farms/services/farmTabs.ts";
import type { Farm, FarmInvitation, FarmRole } from "../../src/features/farms/types/index.ts";

const farm = (role: FarmRole, is_active = true): Farm => ({
  id: 4,
  name: "La Ese",
  role,
  created_at: "2026-11-11T12:00:00Z",
  updated_at: "2026-11-11T12:00:00Z",
  is_active,
  deactivated_at: is_active ? null : "2026-11-12T12:00:00Z",
});

const invitation = (id: number, status: FarmInvitation["status"], created_at: string): FarmInvitation => ({
  id,
  email: `persona${id}@example.com`,
  role: "operador",
  status,
  expires_at: created_at,
  last_sent_at: created_at,
  delivery_pending: false,
  accepted_at: null,
  cancelled_at: null,
  created_at,
  updated_at: created_at,
});

describe("pestaña Configuración", () => {
  it("se agrega al final solo si hay acciones disponibles", () => {
    expect(detailTabs(farm("administrador"), true).map((tab) => tab.id)).toEqual([
      ...visibleTabs(farm("administrador")).map((tab) => tab.id),
      "configuracion",
    ]);
    expect(detailTabs(farm("operador"), true).map((tab) => tab.id)).toEqual([
      "inventarios",
      "galpones",
      "configuracion",
    ]);
    expect(detailTabs(farm("operador", false), false).map((tab) => tab.id)).toEqual([
      "inventarios",
      "galpones",
    ]);
  });
});

describe("Resumen de solo lectura", () => {
  it("cuenta invitaciones por estado y toma la más reciente", () => {
    const stats = invitationStats([
      invitation(1, "accepted", "2026-11-10T10:00:00Z"),
      invitation(2, "pending", "2026-11-12T10:00:00Z"),
      invitation(3, "expired", "2026-11-11T10:00:00Z"),
    ]);
    expect(stats).toMatchObject({ total: 3, accepted: 1, pending: 1 });
    expect(stats.latest?.id).toBe(2);
    expect(invitationStats([]).latest).toBeNull();
  });

  it("arma iniciales a partir del nombre o del correo", () => {
    expect(initials("Israel Tapias")).toBe("IT");
    expect(initials("tupax@gmail.com")).toBe("TG");
    expect(initials("  ")).toBe("?");
  });

  it("en finca activa no renderiza aviso ni acciones", () => {
    const html = renderToStaticMarkup(
      createElement(FarmOverview, {
        farm: farm("administrador"),
        canReactivate: false,
      }),
    );
    expect(html).toBe("");
  });

  it("en finca desactivada muestra el aviso", () => {
    const html = renderToStaticMarkup(
      createElement(FarmOverview, {
        farm: farm("operador", false),
        canReactivate: false,
      }),
    );
    expect(html).toContain("Finca desactivada");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<form");
  });
});

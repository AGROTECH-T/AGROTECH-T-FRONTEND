/**
 * Pruebas de F6-CORRECCIONES-1 en la interfaz.
 *
 * Propósito: acceso sin confirmar sin capacidades privilegiadas, respaldo de
 * desactivar/reactivar sin capacidades obsoletas y estado vacío de Inventario
 * según la capacidad de crear fincas.
 * Contexto: entorno node; HTML estático con renderToStaticMarkup y API inyectada.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FarmDetail } from "../../src/features/farms/components/FarmDetail.tsx";
import {
  NO_CAPABILITIES,
  unconfirmedAccessView,
  withLocalChanges,
} from "../../src/features/farms/services/capabilityGuards.ts";
import {
  canDeactivate,
  canEditName,
  canReactivate,
  deactivateFarm,
  reactivateFarm,
  type LifecycleApi,
} from "../../src/features/farms/services/farmLifecycle.ts";
import { visibleTabs, type FarmTabId } from "../../src/features/farms/services/farmTabs.ts";
import type { Farm, FarmCapabilities, FarmRole } from "../../src/features/farms/types/index.ts";
import { InventarioPanel } from "../../src/features/inventario/components/InventarioPanel.tsx";
import {
  canWriteInventory,
  emptyInventoryState,
} from "../../src/features/inventario/services/inventoryAccess.ts";

const adminActive: FarmCapabilities = {
  can_edit_farm: true,
  can_deactivate_farm: true,
  can_reactivate_farm: false,
  can_view_history: true,
  can_manage_members: true,
  can_manage_invitations: true,
  can_read_inventory: true,
  can_write_inventory: true,
};
const operatorCaps: FarmCapabilities = {
  ...NO_CAPABILITIES,
  can_read_inventory: true,
  can_write_inventory: true,
};
const viewerCaps: FarmCapabilities = { ...NO_CAPABILITIES, can_read_inventory: true };

function farm(role: FarmRole, capabilities?: FarmCapabilities, isActive = true): Farm {
  return {
    id: 7,
    name: "La Esperanza",
    role,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    is_active: isActive,
    deactivated_at: isActive ? null : "2026-11-02T00:00:00Z",
    capabilities,
  };
}

const noop = () => undefined;
const detail = (target: Farm, initialAccessPending = false, initialTab?: FarmTabId) =>
  renderToStaticMarkup(
    createElement(FarmDetail, {
      farm: target,
      initialTab,
      onBack: noop,
      onUpdated: noop,
      onLeft: noop,
      initialAccessPending,
    }),
  );
const tabIds = (target: Farm) => visibleTabs(target).map((tab) => tab.id);

describe("hallazgo 1: acceso sin confirmar", () => {
  it("administrador con acceso confirmado ve sus acciones", () => {
    const html = detail(farm("administrador", adminActive), false, "configuracion");
    expect(html).toContain("Integrantes");
    expect(html).toContain("Editar nombre");
    expect(html).toContain("Desactivar finca");
  });

  it("acceso pendiente con capacidades de administrador anteriores: sin acciones administrativas", () => {
    const original = farm("administrador", adminActive);
    const html = detail(original, true);
    expect(html).toContain("No se pudo confirmar tu acceso");
    expect(html).not.toContain("Integrantes");
    expect(html).not.toContain("Invitaciones");
    expect(html).not.toContain("Historial");
    expect(html).not.toContain("Editar nombre");
    expect(html).not.toContain("Desactivar finca");
    expect(html).not.toContain("Reactivar finca");
  });

  it("la vista degradada no modifica el objeto del servidor", () => {
    const original = farm("administrador", adminActive);
    const view = unconfirmedAccessView(original);
    expect(view.role).toBe("consulta");
    expect(view.capabilities).toEqual(NO_CAPABILITIES);
    expect(Object.values(view.capabilities ?? {}).some(Boolean)).toBe(false);
    expect(original.role).toBe("administrador");
    expect(original.capabilities).toEqual(adminActive);
    expect(tabIds(view)).toEqual(["resumen"]);
    expect(canEditName(view) || canDeactivate(view) || canReactivate(view)).toBe(false);
    expect(canWriteInventory(view)).toBe(false);
  });

  it("operador y consulta no ven acciones no permitidas", () => {
    for (const target of [farm("operador", operatorCaps), farm("consulta", viewerCaps)]) {
      const html = detail(target);
      expect(html).not.toContain("Integrantes");
      expect(html).not.toContain("Editar nombre");
      expect(html).not.toContain("Desactivar finca");
    }
  });

  it("al confirmar el acceso se vuelven a usar las capacidades reales", () => {
    const confirmed = farm("administrador", adminActive);
    expect(tabIds(unconfirmedAccessView(confirmed))).toEqual(["resumen"]);
    expect(tabIds(confirmed)).toEqual(["resumen", "integrantes", "invitaciones", "historial"]);
  });
});

describe("hallazgo 2: respaldo tras desactivar o reactivar", () => {
  const failingApi = (): LifecycleApi => ({
    getFarm: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    deleteFarm: vi.fn().mockResolvedValue(undefined),
    reactivateFarm: vi.fn().mockResolvedValue(undefined),
    leaveFarm: vi.fn().mockResolvedValue(undefined),
  });

  it("desactivación exitosa y refresco fallido: sin capacidades obsoletas", async () => {
    const before = farm("administrador", adminActive, true);
    const after = await deactivateFarm(failingApi(), before);
    expect(after.is_active).toBe(false);
    expect(after.capabilities).toBeUndefined();
    expect(canDeactivate(after)).toBe(false);
    expect(canReactivate(after)).toBe(true);
    expect(canEditName(after)).toBe(false);
    expect(before.capabilities).toEqual(adminActive);
  });

  it("reactivación exitosa y refresco fallido: acciones del estado local conocido", async () => {
    const inactiveCaps: FarmCapabilities = {
      ...NO_CAPABILITIES,
      can_reactivate_farm: true,
      can_view_history: true,
    };
    const before = farm("administrador", inactiveCaps, false);
    const after = await reactivateFarm(failingApi(), before);
    expect(after.is_active).toBe(true);
    expect(after.capabilities).toBeUndefined();
    expect(canReactivate(after)).toBe(false);
    expect(canDeactivate(after)).toBe(true);
    expect(tabIds(after)).toContain("integrantes");
  });

  it("un refresco correcto usa las capacidades reales del servidor", async () => {
    const server = farm("administrador", { ...NO_CAPABILITIES, can_reactivate_farm: true }, false);
    const api: LifecycleApi = { ...failingApi(), getFarm: vi.fn().mockResolvedValue(server) };
    const after = await deactivateFarm(api, farm("administrador", adminActive, true));
    expect(after).toBe(server);
    expect(after.capabilities?.can_reactivate_farm).toBe(true);
  });

  it("withLocalChanges no modifica la finca original", () => {
    const original = farm("operador", operatorCaps);
    const copy = withLocalChanges(original, { is_active: false });
    expect(copy.capabilities).toBeUndefined();
    expect(original.capabilities).toEqual(operatorCaps);
    expect(original.is_active).toBe(true);
  });
});

describe("hallazgo 6: estado vacío de Inventario", () => {
  const render = (account?: { can_create_farms?: boolean }) =>
    renderToStaticMarkup(createElement(InventarioPanel, { account }));

  it("cuenta con capacidad de crear: orienta a crear la finca", () => {
    expect(emptyInventoryState({ can_create_farms: true }).title).toBe("Primero crea una finca");
    expect(render({ can_create_farms: true })).toContain("Primero crea una finca");
  });

  it("cuenta sin capacidad (operador o consulta sin fincas): pide una invitación", () => {
    const state = emptyInventoryState({ can_create_farms: false });
    expect(state.title).not.toContain("crea");
    expect(state.hint).toContain("invite");
    const html = render({ can_create_farms: false });
    expect(html).not.toContain("Primero crea una finca");
    expect(html).toContain("Aún no perteneces a ninguna finca");
  });

  it("operador y consulta con fincas no ven el estado vacío; la escritura depende del rol", () => {
    expect(canWriteInventory(farm("operador", operatorCaps))).toBe(true);
    expect(canWriteInventory(farm("consulta", viewerCaps))).toBe(false);
  });

  it("sin información de capacidades: mensaje neutral y útil", () => {
    const state = emptyInventoryState(undefined);
    expect(state.title).toBe("Aún no tienes fincas disponibles");
    expect(state.hint).toContain("invitación");
    expect(render(undefined)).toContain("Aún no tienes fincas disponibles");
  });
});

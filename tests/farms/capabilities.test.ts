/**
 * Pruebas de capacidades en la interfaz (BUILD F6).
 *
 * Propósito: "Nueva finca" y "Abrir por identificador" según la cuenta,
 * pestañas y acciones según `capabilities`, inventario de solo lectura para
 * Consulta, recálculo al cambiar de finca y respaldo por rol sin capacidades.
 * Contexto: entorno node; HTML estático con renderToStaticMarkup. La
 * autorización real la aplica el backend; aquí solo se prueba la visibilidad.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  emptyHint,
  farmScreenActions,
  FarmsScreen,
} from "../../src/features/farms/components/FarmsScreen.tsx";
import {
  canDeactivate,
  canEditName,
  canReactivate,
} from "../../src/features/farms/services/farmLifecycle.ts";
import { visibleTabs } from "../../src/features/farms/services/farmTabs.ts";
import type { Farm, FarmCapabilities, FarmRole } from "../../src/features/farms/types/index.ts";
import { InventarioBrowser } from "../../src/features/inventario/components/InventarioBrowser.tsx";
import { ProductDetail } from "../../src/features/inventario/components/ProductDetail.tsx";
import { canWriteInventory } from "../../src/features/inventario/services/inventoryAccess.ts";
import type { Product } from "../../src/features/inventario/types/index.ts";

const none: FarmCapabilities = {
  can_edit_farm: false,
  can_deactivate_farm: false,
  can_reactivate_farm: false,
  can_view_history: false,
  can_manage_members: false,
  can_manage_invitations: false,
  can_read_inventory: true,
  can_write_inventory: false,
};
const adminCaps: FarmCapabilities = {
  ...none,
  can_edit_farm: true,
  can_deactivate_farm: true,
  can_view_history: true,
  can_manage_members: true,
  can_manage_invitations: true,
  can_write_inventory: true,
};
const operatorCaps: FarmCapabilities = { ...none, can_write_inventory: true };

function farm(role: FarmRole, capabilities?: FarmCapabilities, id = 1): Farm {
  return {
    id,
    name: `Finca ${id}`,
    role,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    is_active: true,
    deactivated_at: null,
    capabilities,
  };
}

const product: Product = {
  id: 1,
  farm_id: 1,
  name: "Maíz",
  barcode: "7701234567890",
  unit: "kg",
  unit_label: "Kilogramo (kg)",
  category: "concentrados",
  category_label: "Concentrados",
  min_stock: "1.000",
  quantity: "5.000",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const noop = () => undefined;
const tabIds = (target: Farm) => visibleTabs(target).map((tab) => tab.id);

describe("crear fincas y abrir por identificador", () => {
  it("cuenta con capacidad: muestra Nueva finca", () => {
    const html = renderToStaticMarkup(
      createElement(FarmsScreen, {
        account: { can_create_farms: true, can_open_inactive_farms: true },
      }),
    );
    expect(html).toContain("+ Nueva finca");
    expect(html).toContain("Abrir por identificador");
  });

  it("cuenta sin capacidad (operador o consulta): oculta ambas acciones", () => {
    const html = renderToStaticMarkup(
      createElement(FarmsScreen, {
        account: { can_create_farms: false, can_open_inactive_farms: false },
      }),
    );
    expect(html).not.toContain("+ Nueva finca");
    expect(html).not.toContain("Abrir por identificador");
  });

  it("administrador de una finca sin capacidad global: abre por id pero no crea", () => {
    expect(farmScreenActions({ can_create_farms: false, can_open_inactive_farms: true })).toEqual({
      canCreate: false,
      canOpenById: true,
    });
  });

  it("backend anterior sin los campos: conserva el comportamiento previo", () => {
    expect(farmScreenActions(undefined)).toEqual({ canCreate: true, canOpenById: true });
  });

  it("el estado vacío no invita a crear si la cuenta no puede", () => {
    expect(emptyHint(true, true)).toContain("Nueva finca");
    expect(emptyHint(true, false)).toContain("invite");
    expect(emptyHint(false, false)).toContain("buscador");
  });
});

describe("pestañas y acciones por finca", () => {
  it("usa las capacidades del backend", () => {
    expect(tabIds(farm("administrador", adminCaps))).toEqual([
      "resumen",
      "integrantes",
      "invitaciones",
      "historial",
    ]);
    expect(tabIds(farm("operador", operatorCaps))).toEqual(["resumen"]);
    expect(tabIds(farm("consulta", none))).toEqual(["resumen"]);
  });

  it("las capacidades mandan sobre el rol", () => {
    const restricted = farm("administrador", { ...adminCaps, can_manage_invitations: false });
    expect(tabIds(restricted)).not.toContain("invitaciones");
    expect(canEditName(farm("administrador", { ...adminCaps, can_edit_farm: false }))).toBe(false);
    expect(canDeactivate(farm("operador", operatorCaps))).toBe(false);
    expect(canReactivate(farm("administrador", { ...adminCaps, can_reactivate_farm: true }))).toBe(
      true,
    );
  });

  it("sin capacidades recurre al rol (compatibilidad)", () => {
    expect(tabIds(farm("administrador"))).toContain("integrantes");
    expect(tabIds(farm("operador"))).toEqual(["resumen"]);
    expect(canEditName(farm("administrador"))).toBe(true);
    expect(canEditName(farm("consulta"))).toBe(false);
  });
});

describe("inventario", () => {
  it("consulta no ve las acciones de escritura", () => {
    const viewer = farm("consulta", none);
    expect(canWriteInventory(viewer)).toBe(false);
    const list = renderToStaticMarkup(
      createElement(InventarioBrowser, {
        farmId: 1,
        products: [product],
        loading: false,
        error: "",
        onReload: noop,
        onSelect: noop,
        onCreated: noop,
        canWrite: false,
      }),
    );
    expect(list).not.toContain("+ Nuevo insumo");
    const detail = renderToStaticMarkup(
      createElement(ProductDetail, {
        farmId: 1,
        product,
        onBack: noop,
        onChanged: noop,
        canWrite: false,
      }),
    );
    expect(detail).not.toContain("Registrar movimiento");
    expect(detail).toContain("solo permite consultar");
  });

  it("operador y administrador sí ven las acciones de escritura", () => {
    expect(canWriteInventory(farm("operador", operatorCaps))).toBe(true);
    expect(canWriteInventory(farm("administrador", adminCaps))).toBe(true);
    const detail = renderToStaticMarkup(
      createElement(ProductDetail, { farmId: 1, product, onBack: noop, onChanged: noop }),
    );
    expect(detail).toContain("Registrar movimiento");
  });

  it("al cambiar de finca se recalcula la capacidad", () => {
    const farms = [farm("administrador", adminCaps, 1), farm("consulta", none, 2)];
    const pick = (id: number) => canWriteInventory(farms.find((item) => item.id === id));
    expect(pick(1)).toBe(true);
    expect(pick(2)).toBe(false);
    expect(pick(99)).toBe(false);
  });

  it("sin capacidades usa la regla de roles del backend", () => {
    expect(canWriteInventory(farm("operador"))).toBe(true);
    expect(canWriteInventory(farm("consulta"))).toBe(false);
    expect(canWriteInventory({ ...farm("operador"), is_active: false })).toBe(false);
  });
});

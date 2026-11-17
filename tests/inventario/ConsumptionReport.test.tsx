// @vitest-environment jsdom
/**
 * Pruebas del resumen de estadísticas de inventario.
 *
 * Propósito: verificar las cuatro cifras y que no se muestren las gráficas viejas.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumptionReport } from "../../src/features/inventario/components/ConsumptionReport.tsx";
import type { Product } from "../../src/features/inventario/types/index.ts";

const api = vi.hoisted(() => ({
  listAllProducts: vi.fn(),
  getInventoryCatalog: vi.fn(),
}));

vi.mock("../../src/features/inventario/services/inventoryApi.ts", () => ({
  listAllProducts: api.listAllProducts,
  getInventoryCatalog: api.getInventoryCatalog,
}));

function product(changes: Partial<Product> = {}): Product {
  return {
    id: 1,
    farm_id: 6,
    name: "Maíz",
    barcode: "1",
    unit: "kg",
    unit_label: "Kilogramo",
    category: "alimento",
    category_label: "Alimento",
    min_stock: "5",
    quantity: "10",
    lent_quantity: "0",
    is_active: true,
    is_low_stock: false,
    unit_nature: "continua",
    unit_factor: "1",
    unit_decimal_places: 2,
    base_symbol: "kg",
    unit_equivalent: "1 kg",
    has_image: false,
    last_movement_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...changes,
  };
}

beforeEach(() => {
  api.listAllProducts.mockReset().mockResolvedValue([
    product({ id: 1, quantity: "10", is_low_stock: false, category: "alimento", category_label: "Alimento" }),
    product({ id: 2, name: "Sal", quantity: "3", is_low_stock: true, category: "insumo", category_label: "Insumo" }),
    product({ id: 3, name: "Cal", quantity: "0", is_low_stock: true, category: "insumo", category_label: "Insumo" }),
    product({ id: 4, name: "Arena", quantity: "1", is_low_stock: false, category: "herramienta", category_label: "Herramienta" }),
  ]);
  api.getInventoryCatalog.mockReset().mockResolvedValue({ categories: [], units: [] });
});

afterEach(cleanup);

describe("ConsumptionReport", () => {
  it("muestra el resumen de existencias y oculta las gráficas viejas", async () => {
    render(
      <ConsumptionReport
        farmId={6}
        farmName="La Esperanza"
        onBack={() => undefined}
        onLowStock={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByText("Resumen del inventario")).toBeTruthy());
    expect(screen.getByText("Productos registrados").previousElementSibling?.textContent).toBe("4");
    expect(screen.getByText("Disponibles").previousElementSibling?.textContent).toBe("2");
    expect(screen.getByText("Existencias bajas").previousElementSibling?.textContent).toBe("1");
    expect(screen.getByText("Agotados").previousElementSibling?.textContent).toBe("1");
    expect(screen.getByText("Filtros")).toBeTruthy();
    expect(screen.getByText("Categorías más utilizadas")).toBeTruthy();
    expect(screen.getByText("Alimento")).toBeTruthy();
    expect(screen.getByText("Insumo")).toBeTruthy();
    expect(screen.queryByText("Resumen general")).toBeNull();
  });
});

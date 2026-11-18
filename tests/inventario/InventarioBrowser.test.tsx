// @vitest-environment jsdom
/**
 * Pruebas del buscador con lector de códigos.
 *
 * Propósito: el lector USB escribe el código y envía Enter; si coincide un
 * solo producto se abre su ficha, si hay varios se deja la lista filtrada.
 * Contexto: la API se simula, no se toca red ni almacenamiento.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InventarioBrowser } from "../../src/features/inventario/components/InventarioBrowser.tsx";
import type { Product } from "../../src/features/inventario/types/index.ts";

const api = vi.hoisted(() => ({
  listProducts: vi.fn(),
  getInventoryCatalog: vi.fn(),
}));

vi.mock("../../src/features/inventario/services/inventoryApi.ts", () => ({
  listProducts: api.listProducts,
  getInventoryCatalog: api.getInventoryCatalog,
  createMovement: vi.fn(),
  getProduct: vi.fn(),
}));

vi.mock("../../src/features/inventario/services/farmInventories.ts", () => ({
  inventoryIdFor: () => "",
}));

/** Producto mínimo con todos los campos que pinta la tabla. */
function product(id: number, name: string, barcode: string): Product {
  return {
    id,
    farm_id: 1,
    name,
    barcode,
    unit: "1",
    unit_label: "Bulto",
    category: "1",
    category_label: "Concentrado",
    min_stock: "0",
    quantity: "10",
    lent_quantity: "0",
    is_active: true,
    is_low_stock: false,
    unit_nature: "discreta",
    unit_factor: "1",
    unit_decimal_places: 0,
    base_symbol: "u",
    unit_equivalent: "",
    has_image: false,
    last_movement_at: null,
    created_at: "",
    updated_at: "",
  };
}

const onSelect = vi.fn();

const props = {
  farmId: 1,
  inventoryId: "",
  role: "administrador" as const,
  canWrite: true,
  onSelect,
  onEdit: vi.fn(),
  onMove: vi.fn(),
  onMoved: vi.fn(),
  desk: null,
  onDesk: vi.fn(),
  fresh: null,
  onFreshUsed: vi.fn(),
  catalogMark: 0,
};

beforeEach(() => {
  api.listProducts.mockReset();
  api.getInventoryCatalog.mockReset().mockResolvedValue(null);
  onSelect.mockReset();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe("InventarioBrowser", () => {
  it("abre la ficha cuando el código escaneado coincide con un solo producto", async () => {
    const found = product(7, "Maíz amarillo", "770123");
    api.listProducts.mockResolvedValue({ count: 1, page: 1, page_size: 20, results: [found] });

    render(<InventarioBrowser {...props} />);
    await waitFor(() => expect(screen.getByText("Maíz amarillo")).toBeTruthy());

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "770123" } });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(found));
  });

  it("no abre nada cuando el código coincide con varios productos", async () => {
    api.listProducts.mockResolvedValue({
      count: 2,
      page: 1,
      page_size: 20,
      results: [product(7, "Maíz amarillo", "770123"), product(8, "Soya integral", "7701239")],
    });

    render(<InventarioBrowser {...props} />);
    await waitFor(() => expect(screen.getByText("Soya integral")).toBeTruthy());

    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "770123" } });
    const before = api.listProducts.mock.calls.length;
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => expect(api.listProducts.mock.calls.length).toBeGreaterThan(before));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
/**
 * Pruebas de las etiquetas de código de barras en el ajuste.
 *
 * Propósito: la cantidad arranca con el stock, se puede cambiar y solo se
 * descarga cuando hay un código y una cantidad válida.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductAdjustWindow } from "../../src/features/inventario/components/ProductAdjust.tsx";
import type { Product } from "../../src/features/inventario/types/index.ts";

const sheet = vi.hoisted(() => ({ downloadBarcodeSheet: vi.fn() }));

vi.mock("../../src/features/inventario/services/barcodeSheet.ts", () => ({
  downloadBarcodeSheet: sheet.downloadBarcodeSheet,
  MAX_LABELS: 500,
}));

vi.mock("../../src/features/inventario/services/inventoryApi.ts", () => ({
  createMovement: vi.fn(),
  getProduct: vi.fn(),
  downloadProductHistory: vi.fn(),
  listMovements: vi.fn(),
  removeProductImage: vi.fn(),
  uploadProductImage: vi.fn(),
}));

vi.mock("../../src/features/inventario/components/productPhoto.ts", () => ({
  useProductPhoto: () => "",
}));

/** Producto de prueba con el stock pedido. */
function product(changes: Partial<Product> = {}): Product {
  return {
    id: 63,
    farm_id: 6,
    name: "NPK 15-15-15",
    barcode: "7702000002",
    unit: "1",
    unit_label: "Bulto",
    category: "1",
    category_label: "Fertilizante",
    min_stock: "0",
    quantity: "12.000",
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
    ...changes,
  };
}

const onBack = vi.fn();
const onChanged = vi.fn();
const onNotice = vi.fn();

beforeEach(() => {
  sheet.downloadBarcodeSheet.mockReset().mockResolvedValue(undefined);
  onBack.mockReset();
  onChanged.mockReset();
  onNotice.mockReset();
});

afterEach(cleanup);

describe("ProductAdjustWindow", () => {
  it("esconde las etiquetas hasta pulsar el botón de códigos", () => {
    render(
      <ProductAdjustWindow farmId={6} product={product()} onBack={onBack} onChanged={onChanged} />,
    );

    expect(screen.queryByLabelText("Cantidad de etiquetas")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Códigos de barras" }));

    expect(screen.getByLabelText("Cantidad de etiquetas")).toBeTruthy();
  });

  it("descarga las etiquetas con el stock actual por defecto", async () => {
    render(
      <ProductAdjustWindow farmId={6} product={product()} onBack={onBack} onChanged={onChanged} onNotice={onNotice} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Códigos de barras" }));
    const labels = screen.getByLabelText("Cantidad de etiquetas") as HTMLInputElement;
    expect(labels.value).toBe("12");

    fireEvent.click(screen.getByRole("button", { name: "Descargar códigos" }));

    await waitFor(() => expect(sheet.downloadBarcodeSheet).toHaveBeenCalledWith(expect.anything(), 12));
    expect(onNotice).toHaveBeenCalledWith("códigos descargados");
  });

  it("respeta la cantidad que escribe el usuario", async () => {
    render(
      <ProductAdjustWindow farmId={6} product={product()} onBack={onBack} onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Códigos de barras" }));
    fireEvent.change(screen.getByLabelText("Cantidad de etiquetas"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Descargar códigos" }));

    await waitFor(() => expect(sheet.downloadBarcodeSheet).toHaveBeenCalledWith(expect.anything(), 3));
  });

  it("avisa cuando la cantidad no es válida", async () => {
    render(
      <ProductAdjustWindow farmId={6} product={product()} onBack={onBack} onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Códigos de barras" }));
    fireEvent.change(screen.getByLabelText("Cantidad de etiquetas"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Descargar códigos" }));

    expect(screen.getByText("Escribe una cantidad entre 1 y 500.")).toBeTruthy();
    expect(sheet.downloadBarcodeSheet).not.toHaveBeenCalled();
  });

  it("no ofrece etiquetas si el producto no tiene código", () => {
    render(
      <ProductAdjustWindow farmId={6} product={product({ barcode: "" })} onBack={onBack} onChanged={onChanged} />,
    );

    expect(screen.getByText("Sin código de barras")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Códigos de barras" })).toBeNull();
  });
});

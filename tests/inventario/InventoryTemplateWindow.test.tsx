// @vitest-environment jsdom
/**
 * Pruebas de la ventana de plantilla e importación.
 *
 * Propósito: descargar la plantilla, ver el archivo elegido, pedir confirmación
 * con su nombre y mostrar el resumen que devuelve el servidor.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryTemplateWindow } from "../../src/features/inventario/components/InventoryTemplateWindow.tsx";
import type { ImportReport } from "../../src/features/inventario/types/index.ts";

const api = vi.hoisted(() => ({
  downloadInventoryTemplate: vi.fn(),
  importInventory: vi.fn(),
}));

vi.mock("../../src/features/inventario/services/inventoryApi.ts", () => ({
  downloadInventoryTemplate: api.downloadInventoryTemplate,
  importInventory: api.importInventory,
}));

const onClose = vi.fn();
const onImported = vi.fn();
const onNotice = vi.fn();

/** Resumen de la corrida con los valores pedidos. */
function report(changes: Partial<ImportReport> = {}): ImportReport {
  return {
    file: "inventario.xlsx",
    total: 1,
    created: 1,
    updated: 0,
    unchanged: 0,
    categories: 0,
    units: 0,
    created_ids: [91],
    errors: [],
    ...changes,
  };
}

/** Archivo de Excel simulado. */
function sheetFile(name = "inventario.xlsx"): File {
  return new File(["x"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Elige un archivo como lo haría la persona. */
function pick(file: File) {
  fireEvent.change(screen.getByLabelText("Elegir archivo de inventario"), {
    target: { files: [file] },
  });
}

beforeEach(() => {
  api.downloadInventoryTemplate.mockReset().mockResolvedValue(undefined);
  api.importInventory.mockReset().mockResolvedValue(report());
  onClose.mockReset();
  onImported.mockReset();
  onNotice.mockReset();
});

afterEach(cleanup);

describe("InventoryTemplateWindow", () => {
  it("descarga la plantilla de la finca", async () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} onNotice={onNotice} />,
    );

    expect(screen.getByText("Cargar inventario")).toBeTruthy();
    expect(screen.queryByText(/Excel vacío/)).toBeNull();
    expect(screen.queryByText(/Trae tus productos actuales/)).toBeNull();
    expect(screen.queryByLabelText("Columnas de la plantilla")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Descargar plantilla" }));

    await waitFor(() => expect(api.downloadInventoryTemplate).toHaveBeenCalledWith(6));
    expect(onNotice).toHaveBeenCalledWith("plantilla descargada");
  });

  it("muestra el nombre del archivo elegido", () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} />,
    );

    const field = screen.getByLabelText("Archivo cargado") as HTMLInputElement;
    expect(field.value).toBe("");

    pick(sheetFile("finca-6.xlsx"));

    expect(field.value).toBe("finca-6.xlsx");
  });

  it("no importa nada hasta elegir archivo", () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} />,
    );

    const button = screen.getByRole("button", { name: "Importar inventario" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("pide confirmación mostrando el nombre del archivo", () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} />,
    );

    pick(sheetFile("finca-6.xlsx"));
    fireEvent.click(screen.getByRole("button", { name: "Importar inventario" }));

    expect(screen.getByText(/finca-6\.xlsx/)).toBeTruthy();
    expect(api.importInventory).not.toHaveBeenCalled();
  });

  it("importa al confirmar y avisa lo creado", async () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} onNotice={onNotice} />,
    );

    const file = sheetFile();
    pick(file);
    fireEvent.click(screen.getByRole("button", { name: "Importar inventario" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, importar" }));

    await waitFor(() => expect(api.importInventory).toHaveBeenCalledWith(6, file));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(report()));
    expect(onNotice).toHaveBeenCalledWith("inventario importado");
    expect(screen.getByText("Resultado")).toBeTruthy();
  });

  it("lista las filas con error y cuenta el catálogo nuevo", async () => {
    api.importInventory.mockResolvedValue(
      report({ created: 0, categories: 1, units: 1, created_ids: [], errors: [{ row: 4, message: "falta la unidad" }] }),
    );
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} />,
    );

    pick(sheetFile());
    fireEvent.click(screen.getByRole("button", { name: "Importar inventario" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, importar" }));

    await waitFor(() => expect(screen.getByText(/falta la unidad/)).toBeTruthy());
    expect(screen.getByText(/Fila 4/)).toBeTruthy();
    expect(screen.getByText(/1 categoría/)).toBeTruthy();
  });

  it("rechaza archivos que no son Excel", () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite onClose={onClose} onImported={onImported} />,
    );

    pick(sheetFile("inventario.csv"));

    expect(screen.getByText("El archivo debe ser .xlsx.")).toBeTruthy();
    expect(screen.queryByText("inventario.csv")).toBeNull();
  });

  it("no ofrece importar sin permiso de movimientos", () => {
    render(
      <InventoryTemplateWindow farmId={6} canWrite={false} onClose={onClose} onImported={onImported} />,
    );

    expect(screen.getByRole("button", { name: "Descargar plantilla" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Importar inventario" })).toBeNull();
    expect(screen.getByText(/Solo quien registra movimientos/)).toBeTruthy();
  });
});

/**
 * Pruebas del estado visual de stock.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { stockStatus, stockStatusLabel } from "../../src/features/inventario/services/stockStatus.ts";

describe("stockStatus", () => {
  it("marca agotado, bajo y ok", () => {
    expect(stockStatus("0", "5")).toBe("agotado");
    expect(stockStatus("3", "5")).toBe("bajo");
    expect(stockStatus("10", "5")).toBe("ok");
  });

  it("etiqueta los estados en español", () => {
    expect(stockStatusLabel("agotado")).toBe("Agotado");
    expect(stockStatusLabel("bajo")).toBe("Bajo");
    expect(stockStatusLabel("ok")).toBe("OK");
  });
});

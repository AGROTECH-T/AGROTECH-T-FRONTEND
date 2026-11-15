/**
 * Paginación de inventario.
 *
 * Propósito: 25 filas por página y recorte correcto.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { INV_PAGE_SIZE, pageCount, slicePage } from "../../src/features/inventario/services/paging.ts";

describe("paginación de inventario", () => {
  it("usa 25 filas por página", () => {
    expect(INV_PAGE_SIZE).toBe(25);
    expect(pageCount(0)).toBe(1);
    expect(pageCount(25)).toBe(1);
    expect(pageCount(26)).toBe(2);
  });

  it("recorta la lista a la página pedida", () => {
    const items = Array.from({ length: 30 }, (_, index) => index + 1);
    expect(slicePage(items, 1)).toEqual(items.slice(0, 25));
    expect(slicePage(items, 2)).toEqual([26, 27, 28, 29, 30]);
  });
});

/**
 * Pruebas del menu del shell.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "../../src/components/layout/navTypes.ts";

describe("menu del shell", () => {
  it("expone Inicio, Fincas, Inventario y Configuracion", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      "home",
      "fincas",
      "inventario",
      "configuracion",
    ]);
  });
});

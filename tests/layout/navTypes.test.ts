/**
 * Pruebas del menú del shell.
 *
 * Propósito: asegurar las tres secciones de escritorio.
 * Contexto: navegación tras el login.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "../../src/components/layout/navTypes.ts";

describe("menú del shell", () => {
  it("expone Inicio e Inventario en ese orden", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual(["home", "inventario"]);
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(["Inicio", "Inventario"]);
  });
});

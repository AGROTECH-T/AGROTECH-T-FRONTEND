/**
 * Pruebas del menú del shell.
 *
 * Propósito: asegurar las secciones de escritorio y su orden.
 * Contexto: navegación tras el login.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "../../src/components/layout/navTypes.ts";

describe("menú del shell", () => {
  it("expone Inicio, Fincas, Inventario y Configuración en ese orden", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      "home",
      "fincas",
      "inventario",
      "configuracion",
    ]);
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Inicio",
      "Fincas",
      "Inventario",
      "Configuración",
    ]);
  });
});

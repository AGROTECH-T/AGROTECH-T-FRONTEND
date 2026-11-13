/**
 * Pruebas del menú del shell.
 *
 * Propósito: asegurar las secciones de escritorio y su orden.
 * Contexto: navegación tras el login.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { NAV_ITEMS, visibleNavItems } from "../../src/components/layout/navTypes.ts";

describe("menú del shell", () => {
  it("expone Inicio, Fincas, Inventario, Galpón y Configuración en ese orden", () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      "home",
      "fincas",
      "inventario",
      "galpon",
      "configuracion",
    ]);
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Inicio",
      "Fincas",
      "Inventario",
      "Galpón",
      "Configuración",
    ]);
  });

  it("una cuenta nueva solo ve Inicio", () => {
    expect(visibleNavItems(["home"]).map((item) => item.id)).toEqual(["home"]);
  });

  it("el superadmin ve Inicio y Configuración", () => {
    expect(visibleNavItems(["home", "configuracion"]).map((item) => item.id)).toEqual([
      "home",
      "configuracion",
    ]);
  });

  it("el administrador ve todos los módulos", () => {
    expect(
      visibleNavItems(["home", "fincas", "inventario", "galpon", "configuracion"]).map(
        (item) => item.id,
      ),
    ).toEqual(["home", "fincas", "inventario", "galpon", "configuracion"]);
  });
});

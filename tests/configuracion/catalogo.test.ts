/**
 * Pruebas de la presentación del catálogo.
 *
 * Propósito: asegurar que todo rol tiene etiqueta y las columnas mantienen
 * el orden esperado.
 * Contexto: pantalla Configuración > Roles y permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { ROLES_ORDEN, ROL_NOMBRE } from "../../src/features/configuracion/services/catalogo.ts";

describe("catálogo de roles y permisos", () => {
  it("etiqueta todos los roles posibles", () => {
    expect(Object.keys(ROL_NOMBRE)).toEqual([
      "administrador",
      "operador",
      "consulta",
    ]);
    expect(Object.values(ROL_NOMBRE).every((label) => label.length > 0)).toBe(true);
  });

  it("mantiene el orden de las columnas de roles", () => {
    expect(ROLES_ORDEN).toEqual(["administrador", "operador", "consulta"]);
  });
});

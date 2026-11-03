/**
 * Pruebas de la presentación del catálogo.
 *
 * Propósito: asegurar que todo estado de la API tiene etiqueta y las columnas
 * mantienen el orden esperado.
 * Contexto: pantalla Configuración > Roles y permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { ESTADO_LABEL, ROLES_ORDEN } from "../../src/features/configuracion/services/catalogo.ts";

describe("catálogo de roles y permisos", () => {
  it("etiqueta todos los estados posibles", () => {
    expect(Object.keys(ESTADO_LABEL)).toEqual([
      "permitido",
      "no_permitido",
      "condicionado",
      "pendiente",
      "no_requiere",
    ]);
    expect(Object.values(ESTADO_LABEL).every((label) => label.length > 0)).toBe(true);
  });

  it("mantiene el orden de las columnas de roles", () => {
    expect(ROLES_ORDEN).toEqual(["administrador", "operador", "consulta"]);
  });
});

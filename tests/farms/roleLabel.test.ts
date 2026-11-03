/**
 * Pruebas de etiquetas de rol de finca.
 *
 * Propósito: asegurar el texto visible para cada rol interno.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { roleLabel } from "../../src/features/farms/services/roleLabel.ts";

describe("roleLabel", () => {
  it("traduce los tres roles de Farms v1", () => {
    expect(roleLabel("administrador")).toBe("Administrador");
    expect(roleLabel("operador")).toBe("Operador");
    expect(roleLabel("consulta")).toBe("Consulta");
  });
});

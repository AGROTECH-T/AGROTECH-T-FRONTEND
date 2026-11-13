/**
 * Motivos del ajuste.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { ADJUSTMENT_REASONS, reasonLabel } from "../../src/features/inventario/services/adjustmentReasons.ts";

describe("motivos de ajuste", () => {
  it("etiqueta el código conocido", () => {
    expect(reasonLabel("conteo_fisico")).toBe("Conteo físico");
  });

  it("usa el aviso cuando el ajuste viejo no tiene motivo", () => {
    expect(reasonLabel("")).toBe("Sin motivo");
  });

  it("deja el texto de respaldo si el código no existe", () => {
    expect(reasonLabel("no_existe", "Desconocido")).toBe("Desconocido");
  });

  it("trae los siete motivos del reconteo", () => {
    expect(ADJUSTMENT_REASONS).toHaveLength(7);
  });
});

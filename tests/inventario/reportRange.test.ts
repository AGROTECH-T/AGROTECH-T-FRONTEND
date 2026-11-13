/**
 * Rango por defecto de los reportes.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { defaultRange } from "../../src/features/inventario/services/reportRange.ts";

describe("rango de reportes", () => {
  it("abre 30 días contando hoy", () => {
    const range = defaultRange(30);
    const from = new Date(`${range.from}T00:00:00`);
    const to = new Date(`${range.to}T00:00:00`);
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    expect(days).toBe(30);
    expect(range.to).toBe(
      `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`,
    );
  });

  it("acepta un periodo más corto", () => {
    const range = defaultRange(7);
    const from = new Date(`${range.from}T00:00:00`);
    const to = new Date(`${range.to}T00:00:00`);
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    expect(days).toBe(7);
  });
});

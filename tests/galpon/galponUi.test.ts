/**
 * Pruebas de las cifras y fechas del módulo de galpón.
 *
 * Propósito: asegurar que los números del backend se lean sin ceros de
 * relleno y que las edades y unidades usen singular o plural.
 * Contexto: solo funciones puras de presentación.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  ageText,
  dayLabel,
  eventTitle,
  numberText,
  timeText,
  unitText,
} from "../../src/features/galpon/components/galponUi.tsx";

describe("numberText", () => {
  it("quita los ceros de relleno del backend", () => {
    expect(numberText("50.00000")).toBe("50");
    expect(numberText("0.04800")).toBe("0,048");
    expect(numberText("130")).toBe("130");
  });

  it("usa coma decimal y separador de miles", () => {
    expect(numberText("1250.5")).toBe("1.250,5");
    expect(numberText(1250)).toBe("1.250");
  });

  it("devuelve un guion cuando no hay dato", () => {
    expect(numberText(null)).toBe("—");
    expect(numberText("")).toBe("—");
    expect(numberText(undefined)).toBe("—");
  });

  it("respeta el máximo de decimales pedido", () => {
    expect(numberText("48.6666", 1)).toBe("48,7");
    expect(numberText("48.6666", 2)).toBe("48,67");
  });
});

describe("ageText", () => {
  it("escribe la edad en singular y plural", () => {
    expect(ageText(0)).toBe("0 días");
    expect(ageText(1)).toBe("1 día");
    expect(ageText(12)).toBe("12 días");
  });
});

describe("unitText", () => {
  it("concuerda la unidad con la cantidad", () => {
    expect(unitText("aves", 1)).toBe("ave");
    expect(unitText("aves", 3)).toBe("aves");
    expect(unitText("bulto", 2)).toBe("bultos");
    expect(unitText("caneca", "1")).toBe("caneca");
  });

  it("deja igual las unidades que no cambian", () => {
    expect(unitText("kg", 3)).toBe("kg");
    expect(unitText("L", 1)).toBe("L");
  });
});

describe("fechas de la bitácora", () => {
  it("marca el día de hoy y el de ayer", () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    expect(dayLabel(today.toISOString())).toContain("Hoy");
    expect(dayLabel(yesterday.toISOString())).toContain("Ayer");
    expect(dayLabel(null)).toBe("Sin fecha");
  });

  it("devuelve un guion cuando la hora no existe", () => {
    expect(timeText(null)).toBe("—");
  });
});

describe("eventTitle", () => {
  it("marca la vuelta al lote cuando el aislamiento las reintegra", () => {
    expect(eventTitle("aislamiento", { direccion: "devolver" })).toBe("Vuelta al lote");
    expect(eventTitle("aislamiento", { direccion: "apartar" })).toBe("Aislamiento");
  });
});

/**
 * Validación del alta de galpón.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { blankHouse, review } from "../../src/features/galpon/components/HouseForm.tsx";

describe("review de galpón", () => {
  it("deja crear con solo el nombre", () => {
    expect(review({ ...blankHouse(), name: "Galpón 1" })).toEqual({});
  });

  it("pide el nombre al guardar", () => {
    expect(review(blankHouse()).name).toBe(
      "Ponle un nombre al galpón, por ejemplo “Galpón 1”.",
    );
  });

  it("rechaza un largo menor o igual a cero", () => {
    expect(review({ ...blankHouse(), name: "Norte", length_m: "0" }).length_m).toBe(
      "El largo debe ser mayor que cero.",
    );
  });
});

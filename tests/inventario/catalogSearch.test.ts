/**
 * Búsqueda del catálogo.
 *
 * Propósito: coincidir con el nombre o con lo ligado a esa fila.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { matchesCatalogQuery } from "../../src/features/inventario/services/catalogSearch.ts";

describe("búsqueda del catálogo", () => {
  it("sin texto deja pasar todo", () => {
    expect(matchesCatalogQuery("", ["Semilla"])).toBe(true);
    expect(matchesCatalogQuery("   ", ["Semilla"])).toBe(true);
  });

  it("busca en el nombre de esa lista", () => {
    expect(matchesCatalogQuery("semi", ["Semilla", "kg"])).toBe(true);
    expect(matchesCatalogQuery("abono", ["Semilla", "kg"])).toBe(false);
  });

  it("también busca en lo ligado a esa fila", () => {
    expect(matchesCatalogQuery("bulto", ["Alimento/Concentrado", "Bulto (40 kg)"])).toBe(true);
    expect(matchesCatalogQuery("kg", ["Kilogramo", "kg"])).toBe(true);
  });
});

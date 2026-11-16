/**
 * Pruebas del buscador de la barra superior.
 *
 * Propósito: comprobar que filtra por módulos permitidos y por texto.
 * Contexto: alimenta el desplegable de búsqueda del panel.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  SEARCH_ENTRIES,
  searchEntries,
} from "../../src/components/layout/searchEntries.ts";

describe("searchEntries", () => {
  it("no busca con la caja vacía", () => {
    expect(searchEntries("")).toEqual([]);
    expect(searchEntries("   ")).toEqual([]);
  });

  it("encuentra módulos permitidos por su nombre", () => {
    const found = searchEntries("inventa", ["inventario"]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: "section", section: "inventario" });
  });

  it("oculta los módulos que la cuenta no tiene", () => {
    expect(searchEntries("galpón", ["inventario"])).toEqual([]);
    expect(searchEntries("galpón", ["galpon"])).toHaveLength(1);
  });

  it("siempre deja entrar a Mi perfil", () => {
    const found = searchEntries("perfil", []);
    expect(found[0]).toMatchObject({ kind: "section", section: "perfil" });
  });

  it("busca también por la pista del acceso", () => {
    const found = searchEntries("avisos", []);
    expect(found[0]).toMatchObject({ kind: "action", action: "notifications" });
  });

  it("devuelve vacío cuando nada coincide", () => {
    expect(searchEntries("satélite", ["inventario"])).toEqual([]);
  });

  it("el catálogo incluye todas las secciones del menú", () => {
    const ids = SEARCH_ENTRIES.filter((entry) => entry.kind === "section").map(
      (entry) => entry.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("section-inventario");
    expect(ids).toContain("section-perfil");
  });
});

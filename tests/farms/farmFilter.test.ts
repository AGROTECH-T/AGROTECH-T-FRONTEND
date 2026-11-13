/**
 * Pruebas del filtro de fincas por rol y de la cuadrícula del listado.
 *
 * Contexto: entorno node; HTML estático con renderToStaticMarkup.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FarmList } from "../../src/features/farms/components/FarmList.tsx";
import { filterFarms, roleCounts, shortDate } from "../../src/features/farms/services/farmFilter.ts";
import type { Farm, FarmRole } from "../../src/features/farms/types/index.ts";

const farm = (id: number, name: string, role: FarmRole, is_active = true): Farm => ({
  id,
  name,
  role,
  created_at: "2026-11-03T12:00:00Z",
  updated_at: "2026-11-03T12:00:00Z",
  is_active,
  deactivated_at: is_active ? null : "2026-11-05T12:00:00Z",
});

const FARMS = [
  farm(1, "Samir", "administrador"),
  farm(2, "La ese", "operador"),
  farm(3, "Dorado", "consulta"),
  farm(4, "El Roble", "administrador"),
];

describe("filtro por rol", () => {
  it("cuenta las fincas por rol y el total", () => {
    expect(roleCounts(FARMS)).toEqual({ todas: 4, administrador: 2, operador: 1, consulta: 1 });
    expect(roleCounts([])).toEqual({ todas: 0, administrador: 0, operador: 0, consulta: 0 });
  });

  it("combina el rol elegido con la búsqueda por nombre", () => {
    expect(filterFarms(FARMS, "todas", "").map((f) => f.id)).toEqual([1, 2, 3, 4]);
    expect(filterFarms(FARMS, "administrador", "").map((f) => f.id)).toEqual([1, 4]);
    expect(filterFarms(FARMS, "administrador", "  roble ").map((f) => f.id)).toEqual([4]);
    expect(filterFarms(FARMS, "operador", "dorado")).toEqual([]);
  });

  it("formatea la fecha corta y descarta valores inválidos", () => {
    expect(shortDate("2026-11-03T12:00:00Z")).toMatch(/2026/);
    expect(shortDate("no-es-fecha")).toBe("");
    expect(shortDate(null)).toBe("");
  });
});

describe("cuadrícula de fincas", () => {
  it("cada tarjeta tiene un solo botón y muestra su rol", () => {
    const html = renderToStaticMarkup(createElement(FarmList, { farms: FARMS, onSelect: () => undefined }));
    const cards = html.match(/<article[\s\S]*?<\/article>/g) ?? [];
    expect(cards).toHaveLength(4);
    for (const card of cards) expect(card.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('data-role="administrador"');
    expect(html).toContain('data-role="operador"');
    expect(html).toContain('data-role="consulta"');
    expect(html).toContain("Abrir finca");
  });

  it("una finca desactivada se marca y ofrece ver el detalle", () => {
    const html = renderToStaticMarkup(
      createElement(FarmList, { farms: [farm(9, "Vieja", "administrador", false)], onSelect: () => undefined }),
    );
    expect(html).toContain('data-active="false"');
    expect(html).toContain("Desactivada");
    expect(html).toContain("Ver detalle");
  });
});

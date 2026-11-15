/**
 * Columnas de la bitácora según el tipo de registro.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  logCell,
  logColumns,
  logDetail,
  sortLogEvents,
} from "../../src/features/galpon/components/logColumns.ts";
import type { LotEvent } from "../../src/features/galpon/types/index.ts";

function sample(partial: Partial<LotEvent> = {}): LotEvent {
  return {
    id: 1,
    lot_id: 1,
    kind: "ronda",
    occurred_at: "2026-11-11T18:20:00.000Z",
    recorded_at: "2026-11-11T18:20:00.000Z",
    responsible: "Ana Pérez",
    observed_value: null,
    unit: "",
    place: "Lado norte",
    notes: "Temperatura media, cama sin olor fuerte.",
    origin: "humano",
    attention: "informativo",
    state: "cerrado",
    action: "",
    assignee: "",
    follow_up: null,
    estimated: false,
    confirmed: false,
    payload: {},
    corrections: [],
    ...partial,
  };
}

describe("logColumns", () => {
  it("en Todos muestra fecha, tipo, cantidad, quién y nota", () => {
    expect(logColumns("").map((column) => column.id)).toEqual([
      "fecha",
      "hora",
      "tipo",
      "cantidad",
      "quien",
      "nota",
      "acciones",
    ]);
  });

  it("en mortalidad no usa las columnas de alimento ni de nota", () => {
    expect(logColumns("mortalidad").map((column) => column.id)).toEqual([
      "fecha",
      "hora",
      "cantidad",
      "lugar",
      "quien",
      "acciones",
    ]);
  });

  it("en alimento muestra cantidad y etapa, no producto de sanidad", () => {
    expect(logColumns("alimento").map((column) => column.id)).toEqual([
      "fecha",
      "hora",
      "cantidad",
      "etapa",
      "quien",
      "acciones",
    ]);
  });

  it("en sanidad muestra producto, no cantidad genérica", () => {
    expect(logColumns("sanidad").map((column) => column.id)).toEqual([
      "fecha",
      "hora",
      "producto",
      "quien",
      "acciones",
    ]);
  });
});

describe("logCell y logDetail", () => {
  it("recorta la nota en la celda y Ver recibe el texto completo", () => {
    const event = sample({
      notes: "Vacunación Newcastle según calendario y observación larga del lote.",
    });
    expect(logCell("nota", event)).toContain("Vacunación Newcastle");
    expect(logDetail(event).find((row) => row.label === "Nota")?.value).toBe(event.notes);
  });

  it("en detalle omite campos vacíos", () => {
    const event = sample({
      kind: "mortalidad",
      observed_value: "3",
      unit: "aves",
      place: "",
      notes: "",
      payload: {},
    });
    const labels = logDetail(event).map((row) => row.label);
    expect(labels).toContain("Cantidad");
    expect(labels).not.toContain("Nota");
    expect(labels).not.toContain("Lugar");
    expect(labels).not.toContain("Producto");
  });

  it("en alimento muestra la etapa, no un campo genérico de producto", () => {
    const event = sample({
      kind: "alimento",
      observed_value: "150",
      unit: "kg",
      payload: { etapa: "engorde" },
    });
    expect(logCell("etapa", event)).toBe("Engorde");
    expect(logCell("cantidad", event)).toContain("150");
  });
});

describe("sortLogEvents", () => {
  it("deja primero el registro más reciente", () => {
    const older = sample({ id: 1, occurred_at: "2026-11-04T10:00:00.000Z" });
    const newer = sample({ id: 2, occurred_at: "2026-11-11T18:20:00.000Z" });
    expect(sortLogEvents([older, newer]).map((event) => event.id)).toEqual([2, 1]);
  });
});

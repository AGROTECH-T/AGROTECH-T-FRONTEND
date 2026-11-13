/**
 * Validación del alta de lote.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { review } from "../../src/features/galpon/components/LotForm.tsx";
import type { LotDraft } from "../../src/features/galpon/types/index.ts";

/**
 * Borrador mínimo para abrir un lote.
 * @param overrides - Campos a cambiar.
 * @returns Borrador listo para revisar.
 */
function draft(overrides: Partial<LotDraft> = {}): LotDraft {
  return {
    house_id: "1",
    code: "L-001",
    arrived_at: "2026-11-13T08:00",
    received: "130",
    dead_on_arrival: "0",
    discarded_on_arrival: "0",
    supplier: "",
    documents: "",
    initial_age_days: "0",
    initial_weight: "",
    stage: "inicio",
    levante_on: "",
    engorde_on: "",
    feed_type: "",
    reception_notes: "",
    receiver_name: "Ana Pérez",
    ...overrides,
  };
}

describe("review de lote", () => {
  it("deja abrir el lote con galpón, código, aves y quien recibió", () => {
    expect(review(draft(), false)).toEqual({});
  });

  it("pide el galpón y las aves al crear", () => {
    const gaps = review(draft({ house_id: "", received: "" }), false);
    expect(gaps.house_id).toBe("Elige en qué galpón entran las aves.");
    expect(gaps.received).toBe("Escribe cuántas aves llegaron.");
  });

  it("no pide otra vez las aves al editar", () => {
    expect(review(draft({ received: "" }), true).received).toBeUndefined();
  });
});

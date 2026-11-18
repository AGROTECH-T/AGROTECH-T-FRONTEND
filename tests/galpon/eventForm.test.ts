/**
 * Validación del formulario de bitácora.
 *
 * Propósito: el aviso sale al guardar, no al elegir el tipo, y no se
 * guarda si faltan campos obligatorios del tipo.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { review, type Draft } from "../../src/features/galpon/components/EventForm.tsx";

/**
 * Borrador mínimo de un registro.
 * @param overrides - Campos a cambiar.
 * @returns Borrador listo para revisar.
 */
function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    kind: "ronda",
    occurred_at: "2026-11-13T10:00",
    responsible: "Ana Pérez",
    observed_value: "",
    unit: "bulto",
    place: "",
    notes: "",
    stage: "inicio",
    direction: "sumar",
    product: "",
    prescriptor: "",
    estimated: false,
    confirmed: false,
    ...overrides,
  };
}

describe("review de bitácora", () => {
  it("deja guardar una ronda con responsable y fecha", () => {
    expect(review(draft())).toEqual({});
  });

  it("pide el responsable al guardar, no antes", () => {
    expect(review(draft({ responsible: "  " })).responsible).toBe(
      "Escribe quién anota este registro.",
    );
  });

  it("no deja guardar peso, agua o alimento solo con el nombre", () => {
    expect(review(draft({ kind: "peso" })).observed_value).toBe(
      "Escribe el peso observado.",
    );
    expect(review(draft({ kind: "agua" })).observed_value).toBe(
      "Escribe cuánta agua se registró.",
    );
    expect(review(draft({ kind: "alimento" })).observed_value).toBe(
      "Escribe cuánto alimento se entregó.",
    );
  });

  it("acepta peso cuando hay cantidad", () => {
    expect(review(draft({ kind: "peso", observed_value: "0.048", unit: "kg" }))).toEqual(
      {},
    );
  });

  it("pide cuántas aves en mortalidad", () => {
    expect(review(draft({ kind: "mortalidad" })).observed_value).toBe(
      "Escribe cuántas aves murieron.",
    );
  });

  it("pide cantidad al apartar o devolver aves aisladas", () => {
    expect(review(draft({ kind: "aislamiento", direction: "devolver" })).observed_value).toBe(
      "Escribe cuántas aves se aislaron.",
    );
  });
});

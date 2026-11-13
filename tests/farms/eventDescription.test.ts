/**
 * Pruebas de descripción de eventos y cálculo de paginación del historial.
 *
 * Propósito: asegurar la legibilidad de los eventos y la paginación.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  describeEvent,
  totalPages,
} from "../../src/features/farms/services/eventDescription.ts";
import type { AuditEvent } from "../../src/features/farms/types/index.ts";

function event(overrides: Partial<AuditEvent>): AuditEvent {
  return {
    event_type: "farm_created",
    event_type_label: "Finca creada",
    created_at: "2026-11-05T10:30:00Z",
    actor_display: "Ana Pérez",
    entity_type: "farm",
    entity_id: "1",
    before_data: null,
    after_data: null,
    reason: "",
    ...overrides,
  };
}

describe("describeEvent", () => {
  it("describe FARM_CREATED", () => {
    expect(describeEvent(event({ event_type: "farm_created" }))).toBe("Finca creada");
  });

  it("describe FARM_UPDATED con cambio de nombre", () => {
    expect(
      describeEvent(
        event({
          event_type: "farm_updated",
          event_type_label: "Finca actualizada",
          before_data: { name: "Original" },
          after_data: { name: "Nuevo" },
        }),
      ),
    ).toBe("Nombre: Original → Nuevo");
  });

  it("describe FARM_UPDATED sin datos de nombre", () => {
    expect(
      describeEvent(
        event({
          event_type: "farm_updated",
          event_type_label: "Finca actualizada",
        }),
      ),
    ).toBe("Finca actualizada");
  });

  it("describe FARM_DEACTIVATED", () => {
    expect(
      describeEvent(
        event({ event_type: "farm_deactivated", event_type_label: "Finca desactivada" }),
      ),
    ).toBe("Finca desactivada");
  });

  it("describe un evento desconocido usando su etiqueta", () => {
    expect(
      describeEvent(
        event({ event_type: "otro", event_type_label: "Algo nuevo" }),
      ),
    ).toBe("Algo nuevo");
  });

  it("describe un evento desconocido sin etiqueta con texto seguro", () => {
    expect(
      describeEvent(event({ event_type: "otro", event_type_label: "" })),
    ).toBe("Evento registrado");
  });

  it("no falla con datos nulos o incompletos", () => {
    expect(
      describeEvent(
        event({ event_type: "farm_updated", before_data: null, after_data: null }),
      ),
    ).toBe("Finca actualizada");
  });
});

describe("totalPages", () => {
  it("calcula el total de páginas", () => {
    expect(totalPages(45, 20)).toBe(3);
    expect(totalPages(40, 20)).toBe(2);
    expect(totalPages(21, 20)).toBe(2);
  });

  it("devuelve cero cuando no hay eventos", () => {
    expect(totalPages(0, 20)).toBe(0);
  });

  it("devuelve cero ante tamaños de página inválidos", () => {
    expect(totalPages(10, 0)).toBe(0);
  });
});

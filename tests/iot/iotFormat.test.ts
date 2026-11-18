/**
 * Etiquetas y formato IoT.
 */
import { describe, expect, it } from "vitest";
import { metricLabel } from "../../src/features/iot/components/iotFormat.ts";
import { LATEST_SENSORS_PAGE_SIZE } from "../../src/features/iot/components/IotLatestReadings.tsx";

describe("metricLabel", () => {
  it("traduce métricas conocidas al español", () => {
    expect(metricLabel("temperature")).toBe("Temperatura");
    expect(metricLabel("relative_humidity")).toBe("Humedad relativa");
    expect(metricLabel("moisture")).toBe("Humedad del suelo");
  });

  it("deja legible un código desconocido", () => {
    expect(metricLabel("soil_ph")).toBe("soil ph");
  });
});

describe("paginación del resumen", () => {
  it("usa 20 sensores por página", () => {
    expect(LATEST_SENSORS_PAGE_SIZE).toBe(20);
  });
});

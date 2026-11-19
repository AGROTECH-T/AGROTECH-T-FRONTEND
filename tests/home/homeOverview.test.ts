/**
 * Resumen de Inicio.
 */
import { describe, expect, it } from "vitest";
import type { Alert } from "../../src/features/alertas/types/index.ts";
import { moreLabel, splitHomeAlerts } from "../../src/features/home/services/homeOverview.ts";

const sample = (kind: Alert["kind"], id: string): Alert => ({
  id,
  kind,
  title: id,
  detail: "detalle",
  farm_id: 1,
  farm: "Demo",
});

describe("splitHomeAlerts", () => {
  it("separa stock y bitácora y limita la vista previa", () => {
    const alerts = [
      sample("bajo", "s1"),
      sample("agotado", "s2"),
      sample("bajo", "s3"),
      sample("bitacora", "b1"),
      sample("bitacora", "b2"),
      sample("bitacora", "b3"),
    ];
    const overview = splitHomeAlerts(alerts, 2);
    expect(overview.stockTotal).toBe(3);
    expect(overview.stock).toHaveLength(2);
    expect(overview.bitacoraTotal).toBe(3);
    expect(overview.bitacora).toHaveLength(2);
  });
});

describe("moreLabel", () => {
  it("indica cuántos avisos quedan fuera de la vista", () => {
    expect(moreLabel(2, 2)).toBeNull();
    expect(moreLabel(2, 3)).toBe("y 1 más");
    expect(moreLabel(2, 5)).toBe("y 3 más");
  });
});

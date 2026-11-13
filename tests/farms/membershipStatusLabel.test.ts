/**
 * Pruebas de etiquetas de estado de membresía.
 *
 * Propósito: asegurar el texto visible para cada estado interno.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { membershipStatusLabel } from "../../src/features/farms/services/membershipStatusLabel.ts";

describe("membershipStatusLabel", () => {
  it("traduce los tres estados de membresía", () => {
    expect(membershipStatusLabel("active")).toBe("Activa");
    expect(membershipStatusLabel("revoked")).toBe("Revocada");
    expect(membershipStatusLabel("left")).toBe("Abandonada");
  });
});

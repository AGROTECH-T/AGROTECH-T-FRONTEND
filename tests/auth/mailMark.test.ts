/**
 * Pruebas de la arroba del correo.
 *
 * Propósito: cubrir el texto vacío, uno sin arroba y uno con ella.
 * Contexto: la guía no cambia el valor que la persona escribe.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { hasAtSign } from "../../src/features/auth/services/mailMark.ts";

describe("hasAtSign", () => {
  it("no marca un correo vacío", () => {
    expect(hasAtSign("")).toBe(false);
  });

  it("sigue pendiente mientras no hay arroba", () => {
    expect(hasAtSign("ana.correo.com")).toBe(false);
  });

  it("marca el correo cuando aparece la arroba", () => {
    expect(hasAtSign("ana@correo.com")).toBe(true);
  });
});

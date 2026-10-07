/**
 * Pruebas del armado de credenciales.
 *
 * Propósito: cubrir el camino feliz y el borde de espacios.
 * Contexto: el backend exige identificación numérica sin adornos.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { loginPayload } from "../../src/features/auth/services/payload.ts";

describe("loginPayload", () => {
  it("recorta la identificación y conserva la contraseña", () => {
    expect(loginPayload(" 12345678 ", "Secure1!")).toEqual({
      identification: "12345678",
      password: "Secure1!",
    });
  });

  it("deja vacía una identificación en blanco", () => {
    expect(loginPayload("   ", "x").identification).toBe("");
  });
});

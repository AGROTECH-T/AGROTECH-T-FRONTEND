/**
 * Pruebas de la guía de contraseña.
 *
 * Propósito: cubrir la clave vacía, una regla suelta y la clave completa.
 * Contexto: la barra solo queda llena cuando las cinco reglas se cumplen.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { passwordRules } from "../../src/features/auth/services/passwordRules.ts";

const met = (value: string, id: string) => passwordRules(value).find((rule) => rule.id === id)?.met;

describe("passwordRules", () => {
  it("deja todas las reglas pendientes si no hay texto", () => {
    expect(passwordRules("").every((rule) => !rule.met)).toBe(true);
  });

  it("marca solo la mayúscula al escribir una A", () => {
    expect(met("A", "upper")).toBe(true);
    expect(met("A", "lower")).toBe(false);
    expect(met("A", "length")).toBe(false);
  });

  it("marca las cinco reglas con una clave segura", () => {
    expect(passwordRules("Finca12!").every((rule) => rule.met)).toBe(true);
  });

  it("rechaza una clave más larga que el límite", () => {
    expect(met(`${"A".repeat(70)}a1!`, "length")).toBe(false);
  });
});

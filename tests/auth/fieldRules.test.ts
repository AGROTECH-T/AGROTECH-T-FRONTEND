/**
 * Pruebas de los avisos de campo.
 *
 * Propósito: cubrir letras, números, arroba y contraseña.
 * Contexto: un dato válido no produce aviso.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  digitsMessage,
  lettersMessage,
  mailMessage,
  passwordMessage,
  reviewField,
} from "../../src/features/auth/services/fieldRules.ts";

describe("avisos de campo", () => {
  it("pide letras cuando el nombre trae un número", () => {
    expect(lettersMessage("Ana2", "Ana")).toBe("Solo letras. Ejemplo: Ana");
  });

  it("acepta un nombre de solo letras", () => {
    expect(lettersMessage("García", "García")).toBe("");
  });

  it("pide números en la identificación", () => {
    expect(digitsMessage("12ab", "1234567890", 5, 15)).toContain("Solo números");
  });

  it("acepta una identificación numérica", () => {
    expect(digitsMessage("1234567890", "1234567890", 5, 15)).toBe("");
  });

  it("pide la arroba en el correo", () => {
    expect(mailMessage("ana.correo.com")).toContain("@");
  });

  it("acepta un correo con arroba", () => {
    expect(mailMessage("ana@correo.com")).toBe("");
  });

  it("pide la contraseña segura si está a medias", () => {
    expect(passwordMessage("A")).toContain("mayúscula");
  });

  it("acepta una contraseña segura", () => {
    expect(passwordMessage("Finca12!")).toBe("");
  });

  it("nombra el campo en la notificación", () => {
    expect(reviewField("primer nombre", "Solo letras. Ejemplo: Ana")).toBe(
      "Revisa el campo de primer nombre. Solo letras. Ejemplo: Ana",
    );
  });

  it("no arma notificación si el campo está bien", () => {
    expect(reviewField("correo", "")).toBe("");
  });
});

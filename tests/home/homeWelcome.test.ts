/**
 * Pruebas del saludo de Inicio.
 *
 * Propósito: cubrir el saludo y el nombre completo de quien entra.
 * Contexto: sección Inicio.
 */
import { describe, expect, it } from "vitest";
import type { Account } from "../../src/features/auth/types/index.ts";
import { HOME_GREETING, homeGreeting, homeTitle } from "../../src/features/home/services/homeWelcome.ts";

function cuenta(parcial: Partial<Account>): Account {
  return {
    id: 1,
    first_name: "Super",
    last_name: "Admin",
    identification: "1000000001",
    phone: "",
    correo: "",
    is_active: true,
    is_superadmin: false,
    is_administrador: false,
    modulos: ["home"],
    ...parcial,
  };
}

describe("saludo de inicio", () => {
  it("deja solo Bienvenido", () => {
    expect(homeGreeting()).toBe("Bienvenido,");
    expect(HOME_GREETING).toBe("Bienvenido,");
  });

  it("usa el nombre y el apellido de quien entra", () => {
    expect(homeTitle(cuenta({}))).toBe("Super Admin");
    expect(homeTitle(cuenta({ first_name: "Luis", last_name: "Mora" }))).toBe("Luis Mora");
  });
});

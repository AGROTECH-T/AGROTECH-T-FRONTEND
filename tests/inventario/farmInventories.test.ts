/**
 * Inventarios locales de una finca.
 *
 * Propósito: en local, completar filas para ver la paginación.
 * @author Cristian Deysdayr Jimenez
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ensureDemoInventories } from "../../src/features/inventario/services/farmInventories.ts";

function mockLocal() {
  const memory: Record<string, string> = {};
  const localStorage = {
    getItem: (key: string) => memory[key] ?? null,
    setItem: (key: string, value: string) => {
      memory[key] = value;
    },
    removeItem: (key: string) => {
      delete memory[key];
    },
    clear: () => {
      for (const key of Object.keys(memory)) delete memory[key];
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: localStorage, configurable: true });
  Object.defineProperty(globalThis, "window", {
    value: { location: { hostname: "localhost" }, localStorage },
    configurable: true,
  });
}

describe("inventarios de prueba", () => {
  beforeEach(() => {
    mockLocal();
  });

  it("en localhost deja más de 25 inventarios", () => {
    const items = ensureDemoInventories(1);
    expect(items.length).toBeGreaterThan(25);
    expect(ensureDemoInventories(1).length).toBe(items.length);
  });
});

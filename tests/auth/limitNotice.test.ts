/**
 * Pruebas del aviso de límite de intentos.
 *
 * Propósito: cubrir minutos, horas y un error que no es de cuota.
 * Contexto: el texto del regulador no debe llegar a la pantalla.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { limitNotice } from "../../src/services/api/limitNotice.ts";

describe("límite de intentos", () => {
  it("traduce 2097 segundos a 35 minutos", () => {
    const raw = "Solicitud fue regulada (throttled). Se espera que esté disponible en 2097 segundos.";
    expect(limitNotice(raw)).toBe("Límite de intentos alcanzado. Se restablece en 35 minutos.");
  });

  it("traduce una hora exacta", () => {
    const raw = "Solicitud fue regulada (throttled). Se espera que esté disponible en 3600 segundos.";
    expect(limitNotice(raw)).toBe("Límite de intentos alcanzado. Se restablece en 1 hora.");
  });

  it("traduce una hora con minutos", () => {
    const raw = "disponible en 3660 segundos.";
    expect(limitNotice(raw)).toBe(
      "Límite de intentos alcanzado. Se restablece en 1 hora y 1 minuto.",
    );
  });

  it("deja igual un error que no es de cuota", () => {
    expect(limitNotice("Revisa el campo de correo.")).toBe("Revisa el campo de correo.");
  });
});

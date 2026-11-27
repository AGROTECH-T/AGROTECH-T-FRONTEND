// @vitest-environment jsdom
/**
 * Pruebas del aviso flotante.
 *
 * Propósito: el éxito lleva check y el error lleva X.
 * Contexto: notificaciones de la esquina.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoticeStack, type Notice } from "../../src/components/ui/NoticeStack.tsx";

afterEach(cleanup);

describe("NoticeStack", () => {
  it("marca el éxito con un check", () => {
    const item: Notice = {
      id: 1,
      tone: "ok",
      title: "Perfil actualizado",
      detail: "Sus datos se guardaron correctamente.",
    };
    render(<NoticeStack items={[item]} onClose={vi.fn()} />);
    expect(screen.getByRole("status").querySelector("svg")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Perfil actualizado");
    expect(screen.getByRole("status").textContent).toContain("Sus datos se guardaron correctamente.");
    expect(screen.getByRole("status").querySelector(".notice-meter")).toBeTruthy();
  });

  it("marca el error con una X", () => {
    const item: Notice = {
      id: 2,
      tone: "warn",
      title: "No se pudo completar",
      detail: "No se pudo guardar",
    };
    render(<NoticeStack items={[item]} onClose={vi.fn()} />);
    expect(screen.getByRole("alert").querySelector("svg")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("No se pudo guardar");
  });
});

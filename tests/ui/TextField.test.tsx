// @vitest-environment jsdom
/**
 * Pruebas del campo de formulario compartido.
 *
 * Propósito: asegurar etiqueta, aviso de error y botón de ver contraseña.
 * Contexto: lo usan acceso, registro y perfil.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextField } from "../../src/components/ui/TextField.tsx";

afterEach(cleanup);

describe("TextField", () => {
  it("asocia la etiqueta con el input", () => {
    render(
      <TextField
        id="correo"
        label="Correo"
        value="ana@correo.com"
        autoComplete="email"
        onChange={() => {}}
      />,
    );

    const input = screen.getByLabelText("Correo") as HTMLInputElement;
    expect(input.value).toBe("ana@correo.com");
    expect(input.type).toBe("text");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("muestra el aviso y marca el campo como inválido", () => {
    render(
      <TextField
        id="celular"
        label="Celular"
        value="12"
        autoComplete="tel"
        message="Solo números. Ejemplo: 3001234567"
        onChange={() => {}}
      />,
    );

    const input = screen.getByLabelText("Celular");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("celular-error");
    expect(screen.getByText("Solo números. Ejemplo: 3001234567")).toBeTruthy();
  });

  it("alterna la visibilidad de la contraseña", () => {
    render(
      <TextField
        id="clave"
        label="Contraseña"
        type="password"
        value=""
        autoComplete="current-password"
        onChange={() => {}}
      />,
    );

    const input = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(input.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeTruthy();
  });

  it("entrega el texto escrito", () => {
    const onChange = vi.fn();
    render(
      <TextField
        id="nombres"
        label="Primer nombre"
        value=""
        autoComplete="given-name"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Primer nombre"), {
      target: { value: "Ana" },
    });

    expect(onChange).toHaveBeenCalledWith("Ana");
  });
});

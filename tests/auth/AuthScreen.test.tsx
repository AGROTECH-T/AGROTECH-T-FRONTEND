// @vitest-environment jsdom
/**
 * Pruebas del cambio entre ingreso y registro.
 *
 * Propósito: asegurar que "Crear cuenta" vive bajo el botón de entrar y que
 * desde el registro se vuelve con "Ingresar con mi cuenta".
 * Contexto: no se envía ningún formulario, solo se alterna el panel.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuthScreen } from "../../src/features/auth/components/AuthScreen.tsx";

afterEach(cleanup);

describe("AuthScreen", () => {
  it("abre el registro y vuelve al ingreso con el botón de abajo", () => {
    render(<AuthScreen />);

    expect(screen.queryByRole("button", { name: "Ingresar con mi cuenta" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+ Crear cuenta" }));
    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ingresar con mi cuenta" }));
    expect(screen.getByRole("heading", { name: "Ingresar" })).toBeTruthy();
  });

  it("deja un solo botón de crear cuenta, dentro del formulario", () => {
    render(<AuthScreen />);

    expect(screen.getAllByRole("button", { name: "+ Crear cuenta" })).toHaveLength(1);
  });
});

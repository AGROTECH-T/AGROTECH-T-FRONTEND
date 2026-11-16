// @vitest-environment jsdom
/**
 * Pruebas de la pantalla Mi perfil.
 *
 * Propósito: verificar la ficha, la edición, los avisos de campo y el guardado.
 * Contexto: la API se reemplaza por un doble para no salir a la red.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateAccount: vi.fn() }));

vi.mock("../../src/features/auth/services/account.ts", () => ({
  updateAccount: mocks.updateAccount,
}));

import { ProfileScreen } from "../../src/features/profile/components/ProfileScreen.tsx";
import type { Account } from "../../src/features/auth/types/index.ts";

const account: Account = {
  id: 1,
  first_name: "Ana",
  last_name: "Pérez",
  identification: "10203040",
  phone: "3001234567",
  correo: "ana@correo.com",
  is_active: true,
  is_superadmin: false,
  is_administrador: true,
  modulos: ["inventario", "galpon"],
};

beforeEach(() => {
  mocks.updateAccount.mockReset();
  sessionStorage.clear();
});

afterEach(cleanup);

describe("ProfileScreen", () => {
  it("muestra identidad, estado y datos de contacto", () => {
    render(<ProfileScreen account={account} onAccountChange={() => {}} />);

    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getAllByText("ana@correo.com").length).toBeGreaterThan(0);
    expect(screen.getByText("Usuario activo")).toBeTruthy();
    expect(screen.getByText("10203040")).toBeTruthy();
    expect(screen.getByText("3001234567")).toBeTruthy();
  });

  it("marca la cuenta inactiva", () => {
    render(
      <ProfileScreen account={{ ...account, is_active: false }} onAccountChange={() => {}} />,
    );

    expect(screen.getByText("Usuario inactivo")).toBeTruthy();
  });

  it("abre el formulario y cancela sin guardar", () => {
    render(<ProfileScreen account={account} onAccountChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    expect(screen.getByLabelText("Primer nombre")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Primer nombre"), {
      target: { value: "María" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mocks.updateAccount).not.toHaveBeenCalled();
    expect(screen.getByText("Datos de contacto")).toBeTruthy();
  });

  it("guarda los cambios y avisa a la pantalla", async () => {
    const updated = { ...account, first_name: "Ana María" };
    mocks.updateAccount.mockResolvedValue(updated);
    const onAccountChange = vi.fn();
    render(<ProfileScreen account={account} onAccountChange={onAccountChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    fireEvent.change(screen.getByLabelText("Primer nombre"), {
      target: { value: "Ana María" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(mocks.updateAccount).toHaveBeenCalledTimes(1));
    expect(mocks.updateAccount).toHaveBeenCalledWith("", {
      first_name: "Ana María",
      last_name: "Pérez",
      correo: "ana@correo.com",
      phone: "3001234567",
    });
    expect(onAccountChange).toHaveBeenCalledWith(updated);
    expect(await screen.findByText("Perfil actualizado.")).toBeTruthy();
  });

  it("no llama a la API cuando un campo no es válido", async () => {
    render(<ProfileScreen account={account} onAccountChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    fireEvent.change(screen.getByLabelText("Primer nombre"), {
      target: { value: "Ana1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText(/Revisa el campo de primer nombre/),
    ).toBeTruthy();
    expect(mocks.updateAccount).not.toHaveBeenCalled();
  });

  it("muestra el error del servidor al no poder guardar", async () => {
    mocks.updateAccount.mockRejectedValue(new Error("No se pudo guardar"));
    render(<ProfileScreen account={account} onAccountChange={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("No se pudo guardar")).toBeTruthy();
  });
});

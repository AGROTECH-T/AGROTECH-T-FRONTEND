// @vitest-environment jsdom
/**
 * Navegación de fincas desde el menú.
 *
 * Propósito: al cambiar de vista desde el shell, salir del detalle sin
 * depender del botón Volver.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FarmsScreen } from "../../src/features/farms/components/FarmsScreen.tsx";
import type { Farm } from "../../src/features/farms/types/index.ts";

const api = vi.hoisted(() => ({
  listFarms: vi.fn(),
}));

vi.mock("../../src/features/farms/services/farmsApi.ts", () => ({
  listFarms: api.listFarms,
}));

vi.mock("../../src/features/farms/components/FarmDetail.tsx", () => ({
  FarmDetail: ({ farm, onBack }: { farm: Farm; onBack: () => void }) => (
    <div>
      <p>Detalle {farm.name}</p>
      <button type="button" onClick={onBack}>
        Volver
      </button>
    </div>
  ),
}));

vi.mock("../../src/features/farms/components/FarmCreateForm.tsx", () => ({
  FarmCreateForm: () => <p>Formulario crear finca</p>,
}));

const farm: Farm = {
  id: 7,
  name: "La Esperanza",
  role: "administrador",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  api.listFarms.mockReset().mockResolvedValue([farm]);
});

afterEach(cleanup);

describe("FarmsScreen navegación", () => {
  it("sale del detalle al pedir crear desde el menú", async () => {
    const onView = vi.fn();
    const { rerender } = render(
      <FarmsScreen view="lista" tick={1} onView={onView} onLeaveCreate={() => undefined} />,
    );

    await waitFor(() => expect(screen.getByText("La Esperanza")).toBeTruthy());
    fireEvent.click(screen.getByText("La Esperanza"));
    expect(screen.getByText("Detalle La Esperanza")).toBeTruthy();

    rerender(
      <FarmsScreen view="crear" tick={2} onView={onView} onLeaveCreate={() => undefined} />,
    );

    await waitFor(() => expect(screen.getByText("Formulario crear finca")).toBeTruthy());
    expect(screen.queryByText("Detalle La Esperanza")).toBeNull();
  });
});

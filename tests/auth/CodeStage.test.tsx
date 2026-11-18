// @vitest-environment jsdom
/**
 * Pruebas de la pantalla del código OTP.
 *
 * Propósito: asegurar que quedan las casillas y ya no hay foto de fondo.
 * Contexto: la imagen pesaba 800 KB y solo adornaba.
 * @author Cristian Deysdayr Jimenez
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeStage } from "../../src/features/auth/components/CodeStage.tsx";

afterEach(cleanup);

describe("CodeStage", () => {
  it("muestra seis casillas sin imagen ni luces de fondo", () => {
    const { container } = render(
      <CodeStage
        pending={false}
        onBack={() => {}}
        onResend={async () => true}
        onCheck={async () => false}
        onConfirm={() => {}}
      />,
    );

    expect(container.querySelectorAll(".otp-boxes input")).toHaveLength(6);
    expect(container.querySelector(".otp-scene img")).toBeNull();
    expect(container.querySelector(".otp-fly")).toBeNull();
  });
});

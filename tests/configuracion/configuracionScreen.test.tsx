/**
 * Pestañas de Configuración.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfiguracionScreen } from "../../src/features/configuracion/components/ConfiguracionScreen.tsx";
import type { Account } from "../../src/features/auth/types/index.ts";

const account: Account = {
  id: 1,
  first_name: "Ana",
  last_name: "Ruiz",
  identification: "100",
  phone: "3001234567",
  correo: "ana@correo.com",
  is_active: true,
  is_superadmin: false,
  is_administrador: true,
  email_verified: true,
  modulos: ["configuracion", "fincas"],
};

describe("ConfiguracionScreen", () => {
  it("incluye la pestaña de invitaciones", () => {
    const html = renderToStaticMarkup(createElement(ConfiguracionScreen, { account }));
    expect(html).toContain("Invitaciones");
    expect(html).toContain("Roles y permisos");
  });
});

/**
 * Pruebas de descripciones de eventos de membresía y permisos (F2.1).
 *
 * Propósito: comprobar que cada EventType real usa las claves que guarda el
 * backend y que, sin datos, cae en un texto genérico seguro.
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import { describeEvent, reasonLabel } from "../../src/features/farms/services/eventDescription.ts";
import type { AuditEvent } from "../../src/features/farms/types/index.ts";

function event(
  event_type: string,
  before_data: Record<string, unknown> | null = null,
  after_data: Record<string, unknown> | null = null,
  event_type_label = "Etiqueta",
): AuditEvent {
  return {
    event_type,
    event_type_label,
    created_at: "2026-11-11T10:00:00-05:00",
    actor_display: "Ana Ruiz",
    entity_type: "FarmMembership",
    entity_id: "5",
    before_data,
    after_data,
    reason: "",
  };
}

describe("describeEvent: membresía", () => {
  it("member_role_changed muestra el rol anterior y el nuevo", () => {
    expect(describeEvent(event("member_role_changed", { role: "operador" }, { role: "consulta" }))).toBe(
      "Rol: Operador → Consulta",
    );
  });

  it("member_role_changed sin roles válidos usa texto genérico", () => {
    expect(describeEvent(event("member_role_changed", { role: "jefe" }, null))).toBe(
      "Rol de integrante cambiado",
    );
  });

  it("member_revoked indica el estado resultante", () => {
    expect(
      describeEvent(event("member_revoked", { status: "active" }, { status: "revoked" })),
    ).toBe("Membresía revocada (estado: Revocada)");
    expect(describeEvent(event("member_revoked"))).toBe("Membresía revocada");
  });

  it("member_left", () => {
    expect(describeEvent(event("member_left", { status: "active" }, { status: "left" }))).toBe(
      "El integrante abandonó la finca",
    );
  });

  it("admin_transferred usa to_role previo del receptor y from_role nuevo del anterior", () => {
    const text = describeEvent(
      event(
        "admin_transferred",
        { from_role: "administrador", to_role: "consulta" },
        { from_role: "operador", to_role: "administrador" },
      ),
    );
    expect(text).toBe(
      "Administración transferida: el receptor pasó de Consulta a Administrador y " +
        "el administrador anterior pasó a Operador",
    );
  });

  it("admin_transferred sin datos usa texto genérico", () => {
    expect(describeEvent(event("admin_transferred"))).toBe("Administración transferida");
  });

  it("member_joined y member_reactivated muestran el rol de after_data", () => {
    expect(describeEvent(event("member_joined", null, { role: "operador", status: "active" }))).toBe(
      "Se incorporó a la finca como Operador",
    );
    expect(
      describeEvent(event("member_reactivated", null, { role: "consulta", status: "active" })),
    ).toBe("Membresía reactivada como Consulta");
    expect(describeEvent(event("member_joined"))).toBe("Integrante incorporado");
    expect(describeEvent(event("member_reactivated"))).toBe("Integrante reactivado");
  });
});

describe("describeEvent: permisos", () => {
  it("permission_revoked muestra módulo, acción y origen conocido", () => {
    expect(
      describeEvent(
        event("permission_revoked", { module: "inventario", action: "crear", source: "invitation" }),
      ),
    ).toBe("Permiso revocado: inventario · crear (origen: invitación aceptada)");
  });

  it("permission_revoked con origen desconocido no lo muestra", () => {
    expect(
      describeEvent(event("permission_revoked", { module: "inventario", action: "crear", source: "x" })),
    ).toBe("Permiso revocado: inventario · crear");
    expect(describeEvent(event("permission_revoked"))).toBe("Permiso revocado");
  });

  it("permission_unrestricted muestra módulo y acción", () => {
    expect(
      describeEvent(event("permission_unrestricted", { module: "inventario", action: "editar" })),
    ).toBe("Restricción retirada: inventario · editar");
    expect(describeEvent(event("permission_unrestricted"))).toBe("Restricción retirada");
  });
});

describe("compatibilidad", () => {
  it("se mantienen las descripciones de finca existentes", () => {
    expect(describeEvent(event("farm_created"))).toBe("Finca creada");
    expect(describeEvent(event("farm_updated", { name: "A" }, { name: "B" }))).toBe("Nombre: A → B");
    expect(describeEvent(event("farm_deactivated"))).toBe("Finca desactivada");
    expect(describeEvent(event("farm_reactivated"))).toBe("Finca reactivada");
  });

  it("un evento no descrito usa su etiqueta del backend", () => {
    expect(describeEvent(event("invitation_created", null, null, "Invitación creada"))).toBe(
      "Invitación creada",
    );
  });
});

describe("reasonLabel", () => {
  it("traduce las causas automáticas de limpieza de permisos", () => {
    expect(reasonLabel("member_left")).toBe("Abandono de la finca");
    expect(reasonLabel("member_revoked")).toBe("Revocación de la membresía");
    expect(reasonLabel("member_reactivated")).toBe("Reactivación de la membresía");
  });

  it("deja tal cual el motivo escrito por un administrador", () => {
    expect(reasonLabel("Terminó su contrato")).toBe("Terminó su contrato");
  });
});

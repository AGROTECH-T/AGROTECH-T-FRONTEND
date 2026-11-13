/**
 * Pantalla de Configuración.
 *
 * Propósito: agrupar los submódulos administrativos de la plataforma.
 * Contexto: el superadmin nombra administradores; el administrador crea trabajadores.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import type { Account } from "../../auth/types/index.ts";
import { RolesPermisosPanel } from "./RolesPermisosPanel.tsx";
import { SuperadminPanel } from "./SuperadminPanel.tsx";

type Props = {
  account: Account;
};

type TabId = "administradores" | "roles";

/**
 * Texto de apoyo según el submódulo abierto.
 * @param tab - Pestaña activa.
 * @returns Párrafo de cabecera.
 */
function leadDeTab(tab: TabId): string {
  if (tab === "administradores") {
    return "Crea al administrador o nombra a una cuenta que ya se registró.";
  }
  return "Crea usuarios, asigna su rol y suma permisos adicionales.";
}

/**
 * Cabecera, submódulos y contenido de Configuración.
 * @param props - Cuenta autenticada para elegir el panel.
 * @returns Panel del superadmin o de roles de finca.
 */
export function ConfiguracionScreen({ account }: Readonly<Props>) {
  const superadmin = account.is_superadmin;
  const [tab, setTab] = useState<TabId>(superadmin ? "administradores" : "roles");

  return (
    <section className="panel config-panel" aria-labelledby="config-title">
      <header className="panel__header">
        <h1 id="config-title" className="panel__title">
          Configuración
        </h1>
        <p className="panel__lead">{leadDeTab(tab)}</p>
      </header>

      <nav className="config-tabs" aria-label="Submódulos de configuración">
        {superadmin ? (
          <button
            type="button"
            className={`config-tab${tab === "administradores" ? " is-active" : ""}`}
            aria-current={tab === "administradores" ? "page" : undefined}
            onClick={() => setTab("administradores")}
          >
            Administradores
          </button>
        ) : null}
        <button
          type="button"
          className={`config-tab${tab === "roles" ? " is-active" : ""}`}
          aria-current={tab === "roles" ? "page" : undefined}
          onClick={() => setTab("roles")}
        >
          Roles y permisos
        </button>
      </nav>

      {tab === "administradores" ? <SuperadminPanel /> : <RolesPermisosPanel />}
    </section>
  );
}

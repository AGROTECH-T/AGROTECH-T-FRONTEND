/**
 * Pantalla de Configuración.
 *
 * Propósito: agrupar los submódulos administrativos de la plataforma.
 * Contexto: el superadmin nombra administradores; el administrador crea trabajadores.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../auth/types/index.ts";
import { RolesPermisosPanel } from "./RolesPermisosPanel.tsx";
import { SuperadminPanel } from "./SuperadminPanel.tsx";

type Props = {
  account: Account;
};

/**
 * Cabecera, submódulos y contenido de Configuración.
 * @param props - Cuenta autenticada para elegir el panel.
 * @returns Panel del superadmin o de roles de finca.
 */
export function ConfiguracionScreen({ account }: Readonly<Props>) {
  const superadmin = account.is_superadmin;
  return (
    <section className="panel config-panel" aria-labelledby="config-title">
      <header className="panel__header">
        <h1 id="config-title" className="panel__title">
          Configuración
        </h1>
        <p className="panel__lead">
          {superadmin
            ? "Crea al administrador o nombra a una cuenta que ya se registró."
            : "Crea usuarios, asigna su rol y suma permisos adicionales."}
        </p>
      </header>

      <nav className="config-tabs" aria-label="Submódulos de configuración">
        <button type="button" className="config-tab is-active" aria-current="page">
          {superadmin ? "Administradores" : "Roles y permisos"}
        </button>
      </nav>

      {superadmin ? <SuperadminPanel /> : <RolesPermisosPanel />}
    </section>
  );
}

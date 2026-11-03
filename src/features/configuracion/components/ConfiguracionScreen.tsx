/**
 * Pantalla de Configuración.
 *
 * Propósito: agrupar los submódulos administrativos de la plataforma.
 * Contexto: sección del shell autenticado; hoy solo Roles y permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { RolesPermisosPanel } from "./RolesPermisosPanel.tsx";

/**
 * Cabecera, submódulos y contenido de Configuración.
 * @returns Panel con el submódulo Roles y permisos.
 */
export function ConfiguracionScreen() {
  return (
    <section className="panel config-panel" aria-labelledby="config-title">
      <header className="panel__header">
        <h1 id="config-title" className="panel__title">
          Configuración
        </h1>
        <p className="panel__lead">Administra los roles y permisos de la plataforma.</p>
      </header>

      <nav className="config-tabs" aria-label="Submódulos de configuración">
        <button type="button" className="config-tab is-active" aria-current="page">
          Roles y permisos
        </button>
      </nav>

      <RolesPermisosPanel />
    </section>
  );
}

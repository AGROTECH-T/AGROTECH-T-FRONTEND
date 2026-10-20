/**
 * Marco de la app autenticada.
 *
 * Propósito: unir sidebar, barra superior y contenido.
 * Contexto: pantallas posteriores al login en escritorio.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type ReactNode } from "react";
import type { Account } from "../../features/auth/types/index.ts";
import { SideNav } from "./SideNav.tsx";
import { TopBar } from "./TopBar.tsx";
import type { AppSection } from "./navTypes.ts";

type Props = {
  account: Account;
  section: AppSection;
  onNavigate: (section: AppSection) => void;
  onLogout: () => void;
  children: ReactNode;
};

/**
 * Layout con menú plegable, búsqueda y perfil.
 * @param props - Cuenta, navegación y contenido.
 * @returns Shell de escritorio.
 */
export function AppShell({ account, section, onNavigate, onLogout, children }: Readonly<Props>) {
  const [expanded, setExpanded] = useState(true);
  const shellClass = expanded ? "app-shell" : "app-shell is-nav-collapsed";

  return (
    <div className={shellClass}>
      <SideNav
        account={account}
        section={section}
        expanded={expanded}
        onNavigate={onNavigate}
        onToggle={() => setExpanded((open) => !open)}
      />
      <div className="app-shell__column">
        <TopBar account={account} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}

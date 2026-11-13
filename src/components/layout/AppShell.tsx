/**
 * Marco de la app autenticada.
 *
 * Propósito: unir sidebar, barra superior y contenido.
 * Contexto: pantallas posteriores al login en escritorio.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type ReactNode } from "react";
import type { Account } from "../../features/auth/types/index.ts";
import { SideNav } from "./SideNav.tsx";
import { TopBar } from "./TopBar.tsx";
import type { AppSection } from "./navTypes.ts";

type Props = {
  account: Account;
  section: AppSection;
  view: string;
  onNavigate: (section: AppSection, view?: string) => void;
  onLogout: () => void;
  children: ReactNode;
};

/** Ancho a partir del cual el menú lateral cabe con sus etiquetas. */
const COMPACT_QUERY = "(max-width: 1080px)";

/** @returns true si la ventana necesita el menú compacto. */
function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches;
}

/**
 * Layout con menú plegable, búsqueda y perfil.
 * @param props - Cuenta, navegación y contenido.
 * @returns Marco con menú compacto en pantallas angostas.
 */
export function AppShell({ account, section, view, onNavigate, onLogout, children }: Readonly<Props>) {
  const [expanded, setExpanded] = useState(() => !isNarrowViewport());

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const sync = (event: MediaQueryListEvent) => setExpanded(!event.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const shellClass = expanded ? "app-shell" : "app-shell is-nav-collapsed";

  return (
    <div className={shellClass}>
      <SideNav
        account={account}
        section={section}
        view={view}
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

/**
 * Marco de la app autenticada.
 *
 * Propósito: unir sidebar, barra superior y contenido.
 * Contexto: pantallas posteriores al login en escritorio.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type ReactNode } from "react";
import type { Account } from "../../features/auth/types/index.ts";
import { SectionBar } from "./SectionBar.tsx";
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

  useEffect(() => {
    document.body.classList.toggle("is-galpon", section === "galpon");
    return () => document.body.classList.remove("is-galpon");
  }, [section]);

  const shellClass = ["app-shell", expanded ? "" : "is-nav-collapsed"].filter(Boolean).join(" ");

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
        <SectionBar section={section} view={view} onNavigate={onNavigate} />
        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}

/**
 * Barra superior del área autenticada.
 *
 * Propósito: buscar en el sistema, ver notificaciones y abrir el perfil.
 * Contexto: escritorio, encima del contenido principal.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Account } from "../../features/auth/types/index.ts";
import { NotificationsMenu } from "./NotificationsMenu.tsx";
import { ProfileMenu } from "./ProfileMenu.tsx";
import { searchEntries, type SearchEntry } from "./searchEntries.ts";
import type { AppSection } from "./navTypes.ts";

type Props = {
  account: Account;
  onNavigate: (section: AppSection) => void;
  onLogout: () => void;
};

type Panel = "profile" | "notifications" | null;

/**
 * Buscador global, avisos y perfil.
 * @param props - Cuenta, navegación y cierre de sesión.
 * @returns Cabecera del contenido.
 */
export function TopBar({ account, onNavigate, onLogout }: Readonly<Props>) {
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const bar = useRef<HTMLElement>(null);
  const matches = useMemo(() => searchEntries(query), [query]);

  useEffect(() => {
    if (!panel) return;
    const close = (event: MouseEvent) => {
      if (!bar.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [panel]);

  const toggle = (name: Exclude<Panel, null>) =>
    setPanel((current) => (current === name ? null : name));

  const choose = (entry: SearchEntry) => {
    setQuery("");
    if (entry.kind === "section") {
      onNavigate(entry.section);
    } else {
      setPanel(entry.action);
    }
  };

  return (
    <header className="top-bar" ref={bar}>
      <form
        className="top-bar__search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (matches[0]) choose(matches[0]);
        }}
      >
        <svg
          className="top-bar__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <label className="visually-hidden" htmlFor="app-search">
          Buscar en AGROTECH-T
        </label>
        <input
          id="app-search"
          type="search"
          name="q"
          placeholder="Buscar en AGROTECH-T..."
          value={query}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        {matches.length > 0 ? (
          <ul className="top-bar__results">
            {matches.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => choose(entry)}>
                  <span className="top-bar__result-name">{entry.label}</span>
                  <span className="top-bar__result-hint">{entry.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
      <div className="top-bar__actions">
        <NotificationsMenu
          open={panel === "notifications"}
          onToggle={() => toggle("notifications")}
        />
        <ProfileMenu
          account={account}
          open={panel === "profile"}
          onToggle={() => toggle("profile")}
          onLogout={() => {
            setPanel(null);
            onLogout();
          }}
        />
      </div>
    </header>
  );
}

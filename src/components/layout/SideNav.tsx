/**
 * Menú lateral de escritorio.
 *
 * Propósito: cambiar de sección, plegar y mostrar la cuenta activa.
 * Contexto: shell autenticado de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../features/auth/types/index.ts";
import { BrandMark } from "../ui/BrandMark.tsx";
import { AccountChip } from "./AccountChip.tsx";
import { NavIcon } from "./NavIcon.tsx";
import { NAV_ITEMS, type AppSection } from "./navTypes.ts";

type Props = {
  account: Account;
  section: AppSection;
  expanded: boolean;
  onNavigate: (section: AppSection) => void;
  onToggle: () => void;
};

/**
 * Barra lateral con marca, ítems, cuenta y control Ocultar/Mostrar.
 * @param props - Cuenta, sección y callbacks.
 * @returns Navegación semántica del shell.
 */
export function SideNav({ account, section, expanded, onNavigate, onToggle }: Readonly<Props>) {
  const navClass = expanded ? "side-nav" : "side-nav is-collapsed";
  const toggleLabel = expanded ? "Ocultar" : "Mostrar";
  const profileOpen = section === "perfil";
  const profileClass = profileOpen ? "account-button is-active" : "account-button";

  return (
    <aside className={navClass} aria-label="Menú principal">
      <div className="side-nav__top">
        <div className="side-nav__brand" aria-hidden="true">
          <BrandMark className="side-nav__logo" />
        </div>
        <button
          type="button"
          className="side-nav__toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Ocultar menú" : "Mostrar menú"}
          onClick={onToggle}
        >
          {toggleLabel}
        </button>
      </div>
      <nav>
        <ul className="side-nav__list">
          {NAV_ITEMS.map((item) => {
            const active = item.id === section;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={active ? "side-nav__item is-active" : "side-nav__item"}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onNavigate(item.id)}
                >
                  <NavIcon name={item.icon} />
                  {expanded ? <span>{item.label}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="side-nav__foot">
        <button
          type="button"
          className={profileClass}
          aria-current={profileOpen ? "page" : undefined}
          aria-label="Abrir mi perfil"
          title="Mi perfil"
          onClick={() => onNavigate("perfil")}
        >
          <AccountChip account={account} withChevron={expanded} />
        </button>
      </div>
    </aside>
  );
}

/**
 * Menú principal.
 *
 * Propósito: cambiar de sección, plegar y mostrar la cuenta activa.
 * Contexto: lateral con etiquetas en escritorio y barra compacta al angostarse.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../features/auth/types/index.ts";
import { BrandMark } from "../ui/BrandMark.tsx";
import { AccountChip } from "./AccountChip.tsx";
import { NavIcon } from "./NavIcon.tsx";
import { useState } from "react";
import { NAV_ITEMS, type AppSection } from "./navTypes.ts";

type Props = {
  account: Account;
  section: AppSection;
  view: string;
  expanded: boolean;
  onNavigate: (section: AppSection, view?: string) => void;
  onToggle: () => void;
};

/**
 * Barra lateral con marca, ítems, cuenta y control Ocultar/Mostrar.
 * @param props - Cuenta, sección y callbacks.
 * @returns Navegación semántica del shell.
 */
export function SideNav({ account, section, view, expanded, onNavigate, onToggle }: Readonly<Props>) {
  const [openGroup, setOpenGroup] = useState<AppSection | null>(section === "fincas" ? "fincas" : null);
  const navClass = expanded ? "side-nav" : "side-nav is-collapsed";
  const toggleLabel = expanded ? "Ocultar" : "Mostrar";
  const profileOpen = section === "perfil";
  const profileClass = profileOpen ? "account-button is-active" : "account-button";

  const openModule = (itemId: AppSection, childId?: string) => {
    const item = NAV_ITEMS.find((entry) => entry.id === itemId);
    const children = item?.children;
    if (!children?.length) {
      setOpenGroup(null);
      onNavigate(itemId);
      return;
    }
    if (!expanded) {
      onNavigate(itemId, childId ?? children[0].id);
      return;
    }
    const already = openGroup === itemId;
    setOpenGroup(already ? null : itemId);
    if (!already) onNavigate(itemId, childId ?? children[0].id);
  };

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
            const opened = expanded && openGroup === item.id && Boolean(item.children?.length);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={active ? "side-nav__item is-active" : "side-nav__item"}
                  aria-current={active && !item.children ? "page" : undefined}
                  aria-expanded={item.children ? opened : undefined}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => openModule(item.id)}
                >
                  <NavIcon name={item.icon} />
                  {expanded ? <span>{item.label}</span> : null}
                  {expanded && item.children ? <Chevron open={opened} /> : null}
                </button>
                {opened ? (
                  <ul className="side-nav__sub">
                    {item.children?.map((child) => {
                      const current = section === item.id && view === child.id;
                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            className={current ? "side-nav__item is-active" : "side-nav__item"}
                            aria-current={current ? "page" : undefined}
                            onClick={() => onNavigate(item.id, child.id)}
                          >
                            <span>{child.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
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

function Chevron({ open }: Readonly<{ open: boolean }>) {
  return (
    <svg className="side-nav__chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={open ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

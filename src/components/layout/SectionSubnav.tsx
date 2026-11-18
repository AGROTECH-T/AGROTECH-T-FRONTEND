/**
 * Submenú del módulo activo.
 *
 * Propósito: en pantallas angostas el menú lateral no muestra hijos;
 * esta barra deja entrar a Crear catálogo y al resto de vistas.
 * @author Cristian Deysdayr Jimenez
 */

import { NAV_ITEMS, type AppSection } from "./navTypes.ts";

type Props = {
  section: AppSection;
  view: string;
  onNavigate: (section: AppSection, view?: string) => void;
};

/**
 * Chips del módulo abierto.
 * @param props - Sección actual y cambio de vista.
 * @returns Barra de vistas o nada si el módulo no tiene hijos.
 */
export function SectionSubnav({ section, view, onNavigate }: Readonly<Props>) {
  const item = NAV_ITEMS.find((entry) => entry.id === section);
  if (!item?.children?.length) return null;

  return (
    <nav className="section-sub" aria-label={item.label}>
      {item.children.map((child) => (
        <button
          key={child.id}
          type="button"
          className={view === child.id ? "section-sub__item is-on" : "section-sub__item"}
          onClick={() => onNavigate(section, child.id)}
        >
          {child.label}
        </button>
      ))}
    </nav>
  );
}

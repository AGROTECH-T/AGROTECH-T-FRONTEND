/**
 * Atajos de la sección cuando el menú lateral solo muestra iconos.
 *
 * Propósito: no dejar a la persona atrapada dentro de una finca, un
 * producto o un galpón en pantallas angostas.
 * Contexto: debajo del buscador, a partir de 1080px.
 * @author Cristian Deysdayr Jimenez
 */

import { NAV_ITEMS, type AppSection, type NavChild } from "./navTypes.ts";

type Props = {
  section: AppSection;
  view: string;
  onNavigate: (section: AppSection, view?: string) => void;
};

const INVENTARIO_EXTRA: readonly NavChild[] = [
  { id: "consumo", label: "Estadísticas" },
  { id: "reportes", label: "Reportes" },
];

/**
 * Barra horizontal con las vistas de la sección activa.
 * @param props - Sección, vista actual y navegación.
 * @returns Atajos, o null si la sección no tiene vistas.
 */
export function SectionBar({ section, view, onNavigate }: Readonly<Props>) {
  const item = NAV_ITEMS.find((entry) => entry.id === section);
  const links = [...(item?.children ?? [])];
  if (section === "inventario") links.push(...INVENTARIO_EXTRA);
  if (links.length === 0) return null;

  return (
    <nav className="section-bar" aria-label="Atajos de la sección">
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          className={view === link.id ? "is-on" : undefined}
          onClick={() => onNavigate(section, link.id)}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}

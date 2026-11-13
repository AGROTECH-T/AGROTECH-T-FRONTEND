/**
 * Secciones del menú autenticado.
 *
 * Propósito: tipar la navegación del shell de escritorio.
 * Contexto: Fincas, Inventario y Configuración; perfil desde la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

export type AppSection = "home" | "fincas" | "inventario" | "galpon" | "configuracion" | "perfil";

export type NavChild = {
  id: string;
  label: string;
};

export type NavItem = {
  id: AppSection;
  label: string;
  icon: "home" | "land" | "box" | "bird" | "gear";
  children?: readonly NavChild[];
};

/** Ítems fijos del menú lateral. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Inicio", icon: "home" },
  {
    id: "fincas",
    label: "Fincas",
    icon: "land",
    children: [
      { id: "lista", label: "Mis fincas" },
      { id: "crear", label: "Crear finca" },
    ],
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: "box",
    children: [
      { id: "lista", label: "Ver inventario" },
      { id: "inventarios", label: "Inventarios" },
      { id: "crear", label: "Crear producto" },
      { id: "catalogo", label: "Catálogo" },
      { id: "consumo", label: "Estadísticas" },
      { id: "reportes", label: "Reportes" },
    ],
  },
  {
    id: "galpon",
    label: "Galpón",
    icon: "bird",
    children: [{ id: "galpones", label: "Lotes" }],
  },
  { id: "configuracion", label: "Configuración", icon: "gear" },
];

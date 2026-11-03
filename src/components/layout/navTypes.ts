/**
 * Secciones del menú autenticado.
 *
 * Propósito: tipar la navegación del shell de escritorio.
 * Contexto: Fincas, Inventario y Configuración; perfil desde la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

export type AppSection = "home" | "fincas" | "inventario" | "configuracion" | "perfil";

export type NavItem = {
  id: AppSection;
  label: string;
  icon: "home" | "land" | "box" | "gear";
};

/** Ítems fijos del menú lateral. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "fincas", label: "Fincas", icon: "land" },
  { id: "inventario", label: "Inventario", icon: "box" },
  { id: "configuracion", label: "Configuración", icon: "gear" },
];

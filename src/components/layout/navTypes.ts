/**
 * Secciones del menú autenticado.
 *
 * Propósito: tipar la navegación del shell de escritorio.
 * Contexto: Inicio e Inventario; el perfil se abre desde el chip de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

export type AppSection = "home" | "inventario" | "perfil";

export type NavItem = {
  id: AppSection;
  label: string;
  icon: "home" | "box";
};

/** Ítems fijos del menú lateral. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "inventario", label: "Inventario", icon: "box" },
];

/**
 * Layout autenticado de escritorio.
 *
 * Propósito: exportar el shell, la navegación y los datos de búsqueda.
 * Contexto: Inicio, Inventario y el perfil en la barra superior.
 * @author Cristian Deysdayr Jimenez
 */

export { AppShell } from "./AppShell.tsx";
export { SideNav } from "./SideNav.tsx";
export { TopBar } from "./TopBar.tsx";
export { ProfileMenu } from "./ProfileMenu.tsx";
export { NotificationsMenu } from "./NotificationsMenu.tsx";
export { AccountChip, accountInitial, accountName } from "./AccountChip.tsx";
export { SEARCH_ENTRIES, searchEntries, type SearchEntry } from "./searchEntries.ts";
export { NAV_ITEMS, type AppSection, type NavItem } from "./navTypes.ts";

/**
 * Rutas de la interfaz.
 *
 * Propósito: decidir qué página se muestra.
 * Contexto: el acceso es la única ruta publicada.
 * @author Cristian Deysdayr Jimenez
 */

import { AuthPage } from "../../features/auth/pages/AuthPage.tsx";

/** @returns La página que corresponde a la ruta actual. */
export function AppRoutes() {
  return <AuthPage />;
}

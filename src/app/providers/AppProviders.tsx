/**
 * Proveedores de la aplicación.
 *
 * Propósito: envolver el árbol cuando haya contexto compartido.
 * Contexto: hoy solo conserva el lugar para sesión y tema.
 * @author Cristian Deysdayr Jimenez
 */

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Devuelve los hijos dentro de los proveedores activos.
 * @param props - Árbol de React a envolver.
 * @returns El mismo árbol, listo para crecer.
 */
export function AppProviders({ children }: Readonly<Props>) {
  return children;
}

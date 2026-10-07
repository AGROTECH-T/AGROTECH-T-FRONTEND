/**
 * Raíz de la interfaz.
 *
 * Propósito: montar la pantalla de acceso.
 * Contexto: primer frente de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

import { AppRoutes } from "./routes/index.tsx";

/** @returns Las rutas activas de la aplicación. */
export default function App() {
  return <AppRoutes />;
}

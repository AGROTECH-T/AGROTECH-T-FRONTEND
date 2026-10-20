/**
 * Arranque de React.
 *
 * Propósito: montar la aplicación en el documento.
 * Contexto: Vite sirve este módulo como entrada.
 * @author Cristian Deysdayr Jimenez
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import App from "./App.tsx";
import { AppProviders } from "./providers/AppProviders.tsx";
import "../styles/tokens.css";
import "../styles/auth.css";
import "../styles/password.css";
import "../styles/shell.css";
import "../styles/panel.css";
import "../styles/topbar.css";
import "../styles/profile.css";
import "../styles/profile-menu.css";
import "../styles/notifications.css";
import "../styles/inventario.css";
import "../styles/notices.css";
import "../styles/otp.css";

const root = document.getElementById("root");
if (!root) throw new Error("No existe el contenedor raíz");

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);

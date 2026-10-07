/**
 * Configuración de Vite y de las pruebas.
 *
 * Propósito: servir el frontend en el puerto que el backend ya autoriza.
 * Contexto: CORS del API apunta a http://localhost:5173.
 * @author Cristian Deysdayr Jimenez
 */

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});

/**
 * Configuración de Vite y de las pruebas.
 *
 * Propósito: servir el frontend en el puerto que el backend ya autoriza.
 * Contexto: CORS del API apunta a http://localhost:5173. En `vite build` avisa
 * de forma visible si falta `VITE_API_URL`: ese build no podrá consultar la API
 * (ver src/services/api/config.ts).
 * @author Cristian Deysdayr Jimenez
 */

import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { checkBuildApiUrl } from "./src/services/api/apiUrlCheck.ts";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    // Render defines RENDER=true in its builds: there a missing or loopback URL stops the deploy.
    const strict = process.env.RENDER === "true" || process.env.AGROTECH_STRICT_API_URL === "true";
    const check = checkBuildApiUrl(env.VITE_API_URL, strict);
    if (check.level === "error") {
      throw new Error(`[agrotech] ${check.message} Defínela con la URL pública del backend antes de compilar.`);
    }
    if (check.level === "warn") {
      console.warn(`\n[agrotech] AVISO: ${check.message} Defínela con la URL pública del backend antes de desplegar.\n`);
    }
  }
  return {
    plugins: [react()],
    server: { port: 5173, strictPort: true },
    test: { environment: "node", include: ["tests/**/*.test.ts"] },
  };
});

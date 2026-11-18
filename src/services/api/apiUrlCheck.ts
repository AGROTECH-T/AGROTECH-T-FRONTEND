/**
 * Validación de `VITE_API_URL`, compartida por el build y el navegador.
 *
 * Propósito: que un build de producción nunca termine apuntando a `localhost`
 * sin que nadie lo note. No usa `import.meta.env` para poder importarse desde
 * `vite.config.ts` y desde las pruebas.
 */

export type ApiUrlProblem = "missing" | "invalid" | "loopback";

export type ApiUrlCheck =
  | { level: "ok" }
  | { level: "warn" | "error"; problem: ApiUrlProblem; message: string };

const LOOPBACK_HOSTS = new Set(["localhost", "0.0.0.0", "[::1]", "::1"]);

/** True for `localhost`, `*.localhost`, 127.0.0.0/8, 0.0.0.0 and ::1. */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return LOOPBACK_HOSTS.has(host) || host.endsWith(".localhost") || /^127(\.\d{1,3}){3}$/.test(host);
}

/** Classifies a configured URL; `null` when it is acceptable. */
export function apiUrlProblem(value: string | undefined): ApiUrlProblem | null {
  const url = value?.trim() ?? "";
  if (!url) return "missing";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "invalid";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
  return isLoopbackHost(parsed.hostname) ? "loopback" : null;
}

const MESSAGES: Record<ApiUrlProblem, string> = {
  missing: "VITE_API_URL no está definida para este build. La aplicación mostrará un error de configuración y no consultará ninguna API.",
  invalid: "VITE_API_URL no es una URL http(s) válida.",
  loopback: "VITE_API_URL apunta a localhost/127.0.0.1. Un navegador de un usuario real no puede llegar a ese backend.",
};

/**
 * Decide qué hacer en `vite build`.
 * @param value - `VITE_API_URL` cargada para el modo del build.
 * @param strict - true cuando el build es un despliegue (Render define `RENDER=true`):
 *   entonces cualquier problema detiene el build. En local solo avisa, para
 *   permitir builds de prueba.
 */
export function checkBuildApiUrl(value: string | undefined, strict: boolean): ApiUrlCheck {
  const problem = apiUrlProblem(value);
  if (problem === null) return { level: "ok" };
  return { level: strict || problem === "invalid" ? "error" : "warn", problem, message: MESSAGES[problem] };
}

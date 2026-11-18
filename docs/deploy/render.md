# Despliegue del frontend en Render

El frontend es un sitio estático de Vite. `VITE_API_URL` se **incrusta en el
JavaScript al compilar**: cambiarla exige un nuevo build (*Clear build cache &
deploy* o un deploy manual), no basta con reiniciar.

Este documento no fija ningún dominio. La URL del backend es la URL pública
que Render ya muestra en el servicio del backend (panel del servicio → parte
superior, enlace `https://<nombre-del-servicio>.onrender.com` o el dominio
propio configurado en *Settings → Custom Domains*).

## 1. Configurar el Static Site

| Campo | Valor |
|:--|:--|
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

## 2. Variable de entorno

En el Static Site: **Environment → Environment Variables → Add**

| Clave | Valor |
|:--|:--|
| `VITE_API_URL` | URL pública del backend, con `https://` y sin ruta: p. ej. el valor que aparece en el panel del backend. La barra final se elimina sola. |

No uses el valor de `.env.example` (`http://localhost:8090`): es solo para
desarrollo local.

## 3. Rewrite para rutas del cliente

La aplicación procesa rutas como la de aceptación de invitaciones directamente
en el navegador. En **Redirects/Rewrites** agrega:

| Source | Destination | Action |
|:--|:--|:--|
| `/*` | `/index.html` | Rewrite |

## 4. Backend (fuera de este repositorio)

Para que el navegador acepte las respuestas, el backend debe tener en sus
variables de entorno de Render:

- `CORS_ALLOWED_ORIGINS`: incluir el origen del Static Site (`https://…`, sin barra final).
- `FRONTEND_URL`: la URL pública del Static Site (la usa el backend para enlaces de correo e invitaciones).

## Qué pasa si falta la URL

| Situación | Resultado |
|:--|:--|
| Build en Render (`RENDER=true`) sin `VITE_API_URL`, o con `localhost`/`127.0.0.1` | El build **falla** con un mensaje `[agrotech] …`. No se publica nada. |
| Build local (`npm run build`) sin `VITE_API_URL` | Aviso en consola; el build termina para permitir pruebas. |
| App compilada sin URL, abierta en un navegador | Cada solicitud falla con *"Falta configurar VITE_API_URL…"*; nunca consulta `localhost`. |
| App compilada con `localhost` y servida desde un dominio público | Cada solicitud falla con un error de configuración explícito. |
| URL que no es `http(s)` | El build falla siempre. |

Para exigir la misma comprobación estricta fuera de Render (por ejemplo, en
CI), define `AGROTECH_STRICT_API_URL=true` al ejecutar el build.

Lógica: `src/services/api/apiUrlCheck.ts`, `src/services/api/config.ts` y
`vite.config.ts`.

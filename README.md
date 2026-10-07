<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:050505,50:001B2E,100:00F7FF&height=240&section=header&text=AGROTECH-T&fontSize=64&fontColor=00F7FF&animation=fadeIn&fontAlignY=36&desc=FRONTEND%20%2F%2F%20INTELLIGENT%20AGRICULTURAL%20MANAGEMENT%20SYSTEM&descAlignY=59&descSize=15" width="100%"/>

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=20&duration=2200&pause=700&color=00F7FF&center=true&vCenter=true&width=900&lines=%3E+SYSTEM+INITIALIZING...;%3E+AGROTECH-T+FRONTEND;%3E+REACT+%2B+TYPESCRIPT;%3E+VITE+ENGINE;%3E+REST+API+CONNECTION;%3E+AGRICULTURAL+INTERFACE;%3E+MULTI-FARM+PLATFORM;%3E+SYSTEM+ONLINE+%E2%9C%93" alt="Animación de arranque del frontend"/>

<br/>

<img src="https://img.shields.io/badge/FRONTEND-REACT_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
<img src="https://img.shields.io/badge/LANGUAGE-TYPESCRIPT-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/BUILD-VITE-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
<img src="https://img.shields.io/badge/COMM-REST_API-00F7FF?style=for-the-badge&logo=fastapi&logoColor=black" alt="REST API"/>
<img src="https://img.shields.io/badge/STATUS-DEVELOPMENT-yellow?style=for-the-badge&logo=statuspage&logoColor=black" alt="Development"/>
<img src="https://img.shields.io/badge/REPO-FRONTEND_ONLY-001B2E?style=for-the-badge&logo=github&logoColor=00F7FF" alt="Frontend only"/>

<br/><br/>

🛰️ [`SYSTEM`](#system_boot) · 🧬 [`ARCHITECTURE`](#architecture_matrix) · 🧩 [`MODULES`](#frontend_modules) · 🌾 [`DOMAINS`](#domain_matrix) · 🧪 [`STACK`](#technology_matrix) · 🔌 [`API`](#api_layer) · 🚜 [`PROJECT`](#project_database) · 🌿 [`GITFLOW`](#development_protocol) · ⚙️ [`BUILD`](#current_build) · 🗺️ [`ROADMAP`](#roadmap) · 📂 [`STRUCTURE`](#project_structure) · 💻 [`LOCAL BOOT`](#local_boot)

</div>

---

> [!NOTE]
> ## 🛰️ `// SYSTEM_BOOT` — AGROTECH-T FRONTEND · ● DEVELOPMENT
> **Sistema:** Intelligent Agricultural Management System · **Repo:** `AGROTECH-T-FRONTEND` (solo frontend) · **Entorno:** Desarrollo · **Backend:** repositorio separado (`AGROTECH-T-BACKEND`)

<a id="system_boot"></a>

<div align="center">

```text
AGROTECH-T FRONTEND ...................... ● DEVELOPMENT
FRAMEWORK ................................ REACT 19
LANGUAGE ................................. TYPESCRIPT
BUILD TOOL ............................... VITE 8
COMMUNICATION ............................ REST API // JSON SOBRE HTTP
BACKEND .................................. DJANGO + DRF // REPOSITORIO SEPARADO
DATABASE ................................. GESTIONADA POR EL BACKEND // SIN ACCESO DIRECTO
ENTRY POINT .............................. src/app/main.tsx -> AppRoutes -> AuthPage
```

</div>

> [!IMPORTANT]
> El frontend **nunca** accede directamente a MariaDB.
>
> ```text
> USER
>  ↓
> REACT + TYPESCRIPT ............ ESTE REPOSITORIO
>  ↓
> REST API ...................... JSON SOBRE HTTP
>  ↓
> DJANGO + DRF .................. AGROTECH-T-BACKEND
>  ↓
> MARIADB ....................... BASE DE DATOS ÚNICA // SOLO BACKEND
> ```

---

<a id="architecture_matrix"></a>
## 🧬 `// ARCHITECTURE_MATRIX`

<div align="center">

```text
┌─────────────────────────────┐
│            USER             │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│     REACT + TYPESCRIPT      │
│   AGROTECH-T-FRONTEND // UI │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│     API CLIENT + SERVICES   │
│  src/services/api/*.ts      │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│          REST API           │
│      JSON SOBRE HTTP        │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│        DJANGO + DRF         │
│   AGROTECH-T-BACKEND // API │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│           MARIADB           │
│   SOLO BACKEND // SIN UI    │
└─────────────────────────────┘
```

</div>

> [!TIP]
> **Frontend desacoplado, preparado para consumir el backend.**
> Este repositorio es una aplicación web independiente. Toda la persistencia,
> autenticación y reglas de negocio viven en el backend. El frontend solo
> envía JSON, adjunta `Bearer` cuando corresponde y renderiza la respuesta.

<details>
<summary><b>🔌 REGLA DE FRONTERA — lo que este repo sí / no hace</b></summary>

```text
✅ SÍ:  UI + rutas + formularios + cliente HTTP + tipos + estilos
✅ SÍ:  leer VITE_API_URL del entorno y normalizar la barra final
❌ NO:  SQL directo, modelos de base de datos, secretos, lógica del backend
```

- Cada dominio arma sus operaciones sobre `src/services/api/client.ts`.
- `src/components/` guarda piezas reutilizables, nunca pantallas de un dominio.
- `docs/api/README.md` es la referencia de los contratos que esta UI consume.

</details>

---

<a id="frontend_modules"></a>
## 🧩 `// FRONTEND_MODULES`

<div align="center">

```text
src/
│
├── 🧠 app/
│   ├── App.tsx
│   ├── main.tsx
│   ├── providers/AppProviders.tsx
│   └── routes/index.tsx ............. SOLO AuthPage
│
├── 🧱 components/
│   ├── feedback/
│   ├── layout/
│   └── ui/TextField.tsx
│
├── 🌾 features/
│   ├── 👤 auth/ ..................... 🟢 PANTALLA REAL
│   │   ├── components/AuthScreen.tsx
│   │   ├── components/SignInForm.tsx
│   │   ├── components/SignUpForm.tsx
│   │   ├── components/RecoverForm.tsx
│   │   ├── components/SessionPanel.tsx
│   │   ├── components/WelcomeSide.tsx
│   │   ├── pages/AuthPage.tsx
│   │   ├── services/account.ts
│   │   ├── services/session.ts
│   │   └── services/payload.ts
│   │
│   ├── 🏡 farms/ .................... 🟡 RESERVADO
│   ├── 🌱 production/ ............... 🟡 RESERVADO
│   │   ├── 🐔 avicultura/
│   │   ├── 🐟 piscicultura/
│   │   ├── 🐖 porcicultura/
│   │   ├── 🌱 agricultura/
│   │   └── 💧 hidroponia/
│   ├── 📦 inventario/ ............... 🟡 RESERVADO
│   ├── 📊 dashboard/ ................ 🟡 RESERVADO
│   ├── 🚨 alertas/ .................. 🟡 RESERVADO
│   ├── 🔎 trazabilidad/ ............. 🟡 RESERVADO
│   └── 📡 iot/ ...................... 🟡 RESERVADO
│
├── 🔌 services/api/
│   ├── client.ts .................... postJson + getJson + Bearer
│   └── config.ts .................... apiRoot() desde VITE_API_URL
│
├── 🪝 hooks/index.ts
├── 📚 lib/index.ts
├── 🏷️ types/index.ts
├── 🎨 styles/auth.css
├── 🎨 styles/tokens.css
├── ⚙️ config/index.ts ............... reservado
└── 🖼️ assets/campo.jpg
```

</div>

> [!NOTE]
> 🟢 = pantalla/servicio real verificado en `src/`.
> 🟡 = carpeta + `index.ts` reservado, sin UI ni lógica. Sin abstracciones prematuras.

---

<a id="domain_matrix"></a>
## 🌾 `// DOMAIN_MATRIX`

<div align="center">

| DOMINIO | RUTA | ESTADO UI | NOTA |
|:--------|:-----|:---------:|:-----|
| 👤 AUTH | `src/features/auth/` | 🟢 PANTALLA REAL | Ingreso, registro, recuperación, sesión |
| 🏡 FARMS | `src/features/farms/` | 🟡 RESERVADO | Sin pantalla · espera al backend |
| 🌱 PRODUCTION | `src/features/production/` | 🟡 RESERVADO | Contenedor de 5 subdominios |
| 📦 INVENTORY | `src/features/inventario/` | 🟡 RESERVADO | Sin pantalla |
| 📊 DASHBOARD | `src/features/dashboard/` | 🟡 RESERVADO | Sin pantalla |
| 🚨 ALERTS | `src/features/alertas/` | 🟡 RESERVADO | Sin pantalla |
| 🔎 TRACEABILITY | `src/features/trazabilidad/` | 🟡 RESERVADO | Sin pantalla |
| 📡 IoT | `src/features/iot/` | 🟡 RESERVADO | Sin pantalla · sensores en el futuro |

</div>

<div align="center">

| SUBDOMINIO | RUTA | ESTADO UI |
|:-----------|:-----|:---------:|
| 🐔 AVICULTURA | `src/features/production/avicultura/` | 🟡 RESERVADO |
| 🐟 PISCICULTURA | `src/features/production/piscicultura/` | 🟡 RESERVADO |
| 🐖 PORCICULTURA | `src/features/production/porcicultura/` | 🟡 RESERVADO |
| 🌱 AGRICULTURA | `src/features/production/agricultura/` | 🟡 RESERVADO |
| 💧 HIDROPONIA | `src/features/production/hidroponia/` | 🟡 RESERVADO |

**La única ruta publicada hoy es `AuthPage` (`src/app/routes/index.tsx`). Todo lo demás es estructura reservada.**

</div>

---

<a id="technology_matrix"></a>
## 🧪 `// TECHNOLOGY_MATRIX`

<div align="center">

### ⚙️ STACK FRONTEND — ESTE REPOSITORIO
<img src="https://skillicons.dev/icons?i=react,typescript,vite,git,github" alt="Stack frontend"/>

<br/>

<img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
<img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
<img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
<img src="https://img.shields.io/badge/Vitest-TESTS-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest"/>
<img src="https://img.shields.io/badge/ESLint-LINT-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint"/>
<img src="https://img.shields.io/badge/Manrope-FONT-00F7FF?style=for-the-badge&logo=googlefonts&logoColor=black" alt="Manrope"/>

### 🐍 STACK BACKEND — REPOSITORIO SEPARADO `AGROTECH-T-BACKEND`
<img src="https://skillicons.dev/icons?i=python,django" alt="Stack backend"/>

</div>

> [!NOTE]
> Solo se lista lo declarado en `package.json`: `react`, `react-dom`, `@fontsource/manrope`, `vite`, `typescript`, `vitest`, `eslint`, `oxlint`, `@vitejs/plugin-react`. Nada más.

---

<a id="api_layer"></a>
## 🔌 `// API_LAYER`

<div align="center">

```text
FRONTEND ...................... REACT + TYPESCRIPT
   │
   ▼
API CLIENT .................... src/services/api/client.ts
                                postJson() + getJson() + Bearer
   │
   ▼
ENV CONFIG .................... src/services/api/config.ts
                                apiRoot() <- VITE_API_URL
   │
   ▼
REST API ...................... JSON SOBRE HTTP
   │
   ▼
DJANGO REST FRAMEWORK ......... AGROTECH-T-BACKEND
   │
   ▼
BACKEND ....................... PERSISTENCIA + REGLAS + AUTH
```

</div>

> [!TIP]
> Contratos documentados en [`docs/api/README.md`](docs/api/README.md) — el contrato de cuentas vive en el backend. Esta UI consume:
>
> - `POST /api/v1/accounts/`
> - `POST /api/v1/auth/login/`
> - `GET /api/v1/auth/me/`
> - `POST /api/v1/auth/logout/`
> - `POST /api/v1/auth/password/recovery/`
> - `POST /api/v1/auth/password/reset/`
>
> Base local: `http://localhost:8090`. No se documenta aquí ningún otro endpoint porque no está definido en este repositorio.

<details>
<summary><b>🧬 CÓMO HABLA ESTA UI CON LA API</b></summary>

- `apiRoot()` lee `import.meta.env.VITE_API_URL` y quita la barra final. Sin esa variable, usa `http://localhost:8090`.
- `postJson(path, body, token?)` envía JSON y lanza `Error(data.error)` si `!response.ok`.
- `getJson(path, token)` consulta recursos protegidos con `Authorization: Bearer <token>`.
- Cada dominio (`features/auth/services/*.ts`) arma sus operaciones encima del cliente compartido.

</details>

---

<a id="project_database"></a>
## 🚜 `// PROJECT_DATABASE`

<div align="center">

### PROJECT_01 — AGROTECH-T FRONTEND · 🟡 DEVELOPMENT

| CAMPO | VALOR |
|:------|:------|
| TIPO | WEB APPLICATION // interfaz de usuario |
| ESTADO | 🟡 DEVELOPMENT // solo acceso implementado |
| FRAMEWORK | REACT 19 |
| LENGUAJE | TYPESCRIPT |
| BUILD | VITE 8 · puerto `5173` |
| COMUNICACIÓN | REST API // `VITE_API_URL` → `http://localhost:8090` |
| BACKEND | `AGROTECH-T-BACKEND` // Django + DRF + MariaDB |
| DOMINIO | AGRICULTURAL MANAGEMENT · multi-finca |
| ESTILO | NEOMORFISMO + PALETA VERDE MONOCROMÁTICA // pantalla de acceso |
| TESTS | VITEST // `tests/**/*.test.ts` |

</div>

---

<a id="development_protocol"></a>
## 🌿 `// DEVELOPMENT_PROTOCOL` — GITFLOW

<div align="center">

```text
main ............................ ● ESTABLE
  │
  ▼
develop ....................... ● INTEGRACIÓN
  │
  ▼
feature/* ................... ● DESARROLLO AISLADO
```

| RAMA | ROL |
|:-----|:----|
| `main` | Solo código estable · sin desarrollo experimental |
| `develop` | Rama de integración |
| `feature/*` | Una rama aislada por funcionalidad |

</div>

> [!IMPORTANT]
> **Reglas del protocolo**
> - No desarrollar directamente en `main`
> - No `push --force` · No `reset --hard` · No `git clean` · No eliminar ramas sin coordinación
> - Revisar los cambios antes de cada commit · Probar antes de integrar · Commits claros

---

<a id="current_build"></a>
## ⚙️ `// CURRENT_BUILD` — ESTADO REAL

<div align="center">

| COMPONENTE | ESTADO | EVIDENCIA |
|:-----------|:------:|:----------|
| 🟢 BASE REACT + TYPESCRIPT + VITE | ✅ HECHO | `package.json` · `src/app/main.tsx` · `vite.config.ts` |
| 🟢 ESTRUCTURA MODULAR `src/` | ✅ HECHO | `app/` `features/` `services/` `components/` `hooks/` `lib/` `types/` `styles/` `config/` |
| 🟢 PANTALLA DE ACCESO | ✅ HECHO | `features/auth/pages/AuthPage.tsx` + 6 componentes |
| 🟢 CLIENTE REST + `VITE_API_URL` | ✅ HECHO | `services/api/client.ts` · `services/api/config.ts` |
| 🟢 SERVICIOS AUTH | ✅ HECHO | `account.ts` `session.ts` `payload.ts` |
| 🟢 TEST AUTH | ✅ HECHO | `tests/auth/payload.test.ts` |
| 🟢 DOCS BASE | ✅ HECHO | `docs/architecture/` `docs/api/` `docs/modules/` `docs/decisions/` |
| 🟡 INTEGRACIÓN API EN VIVO | ⬜ POR VERIFICAR | Cliente listo · falta validación contra backend local |
| 🟡 MULTI-FINCA UI | ⬜ SIN INICIAR | `features/farms/` reservado |
| 🟡 PRODUCCIÓN UI | ⬜ SIN INICIAR | `features/production/*/` reservados |
| ⚪ IoT / TRAZABILIDAD / PANEL UI | ⬜ RESERVADO | Sin pantalla |

</div>

---

<a id="roadmap"></a>
## 🗺️ `// ROADMAP`

<div align="center">

| ESTADO | HITO |
|:------:|:-----|
| ✅ | BASE REACT + TYPESCRIPT + VITE |
| ✅ | PANTALLA DE ACCESO · INGRESO / REGISTRO / RECUPERACIÓN |
| ✅ | CLIENTE REST · `postJson` / `getJson` / `Bearer` |
| 🔄 | INTEGRACIÓN API EN VIVO CONTRA BACKEND LOCAL |
| 🔄 | MULTI-FINCA UI |
| 🔄 | AVICULTURA UI · primer módulo productivo |
| ⬜ | PISCICULTURA UI |
| ⬜ | PORCICULTURA UI |
| ⬜ | AGRICULTURA UI |
| ⬜ | HIDROPONIA UI |
| ⬜ | INVENTARIO UI |
| ⬜ | PANEL UI |
| ⬜ | ALERTAS UI |
| ⬜ | TRAZABILIDAD UI · QR |
| ⬜ | IoT UI · sensores y dispositivos |
| ⬜ | IA UI · visión |

> ✅ hecho (verificado en `src/`) · 🔄 siguiente en cola (sin iniciar) · ⬜ planificado/reservado

</div>

---

<a id="project_structure"></a>
## 📂 `// PROJECT_STRUCTURE`

<div align="center">

```text
AGROTECH-T-FRONTEND/
│
├── 📄 index.html .................... #root + /src/app/main.tsx
├── ⚙️ vite.config.ts ................ puerto 5173 + vitest
├── 📦 package.json .................. dev / build / lint / preview / test
├── 🌿 .env.example .................. VITE_API_URL=http://localhost:8090
│
├── 📁 src/
│   ├── 🧠 app/ ....................... App.tsx · main.tsx · providers · routes
│   ├── 🧱 components/ ................ feedback · layout · ui/TextField.tsx
│   ├── 🌾 features/ .................. auth (real) + 7 dominios reservados
│   ├── 🔌 services/api/ ............. client.ts + config.ts
│   ├── 🪝 hooks/
│   ├── 📚 lib/
│   ├── 🏷️ types/
│   ├── 🎨 styles/ .................... auth.css + tokens.css
│   ├── ⚙️ config/ .................... reservado
│   └── 🖼️ assets/campo.jpg
│
├── 🧪 tests/auth/payload.test.ts
├── 📚 docs/api + architecture + modules + decisions
├── 🌍 public/favicon.svg
└── 📖 README.md ..................... ESTE ARCHIVO // SYSTEM INTERFACE
```

</div>

---

<a id="local_boot"></a>
## 💻 `// LOCAL_BOOT`

```bash
npm install
copy .env.example .env.development
npm run dev
```

> [!TIP]
> **Arranque local verificado contra este repo:**
> - Sirve en `http://localhost:5173` (`vite.config.ts` → `server.port 5173` + `strictPort`).
> - La API esperada es `http://localhost:8090` (`VITE_API_URL` en `.env.example`).
> - `.env*` está ignorado por Git — jamás commitear valores reales.

| COMANDO | QUÉ HACE | ORIGEN |
|:--------|:---------|:-------|
| `npm install` | Instala dependencias | `package.json` |
| `npm run dev` | Sirve el frontend en `5173` | `vite` |
| `npm run build` | Verifica tipos + compila (`tsc -b && vite build`) | `package.json` |
| `npm run lint` | Analiza el código (`eslint .`) | `package.json` |
| `npm run preview` | Previsualiza la compilación | `package.json` |
| `npm test` | Ejecuta pruebas (`vitest run`) | `package.json` |

> [!NOTE]
> La variable real es `VITE_API_URL` (no `VITE_API_BASE_URL`). Se lee en `src/services/api/config.ts` vía `import.meta.env.VITE_API_URL`.

---

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=18&duration=2500&pause=1000&color=00F7FF&center=true&vCenter=true&width=700&lines=%3E+BUILD.;%3E+CONNECT.;%3E+GROW.;%3E+AGROTECH-T+FRONTEND." alt="Cierre"/>

**🌾 AGROTECH-T // INTELLIGENT AGRICULTURAL MANAGEMENT SYSTEM**
<br/>
`REACT · TYPESCRIPT · VITE · REST API`

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00F7FF,50:001B2E,100:050505&height=140&section=footer" width="100%"/>

</div>

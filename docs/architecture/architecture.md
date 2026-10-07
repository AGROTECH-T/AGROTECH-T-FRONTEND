# Arquitectura del frontend

React, TypeScript y Vite. La interfaz es un proyecto aparte del backend.

- `src/app` arranca la aplicación, los proveedores y las rutas.
- `src/features` agrupa cada dominio. Hoy solo `auth` tiene pantalla.
- `src/services/api` habla con el backend. Cada dominio arma sus propias operaciones encima.
- `src/components` guarda piezas reutilizables, no pantallas de un dominio.

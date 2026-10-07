# API que consume el frontend

Base local: `http://localhost:8090`

El contrato de cuentas vive en el backend, en `docs/api/accounts.md` de AGROTECH-T-BACKEND. Esta interfaz usa:

- `POST /api/v1/accounts/`
- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/me/`
- `POST /api/v1/auth/logout/`
- `POST /api/v1/auth/password/recovery/`
- `POST /api/v1/auth/password/reset/`

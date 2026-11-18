# Módulos

| Dominio | Estado |
|---|---|
| auth | Pantalla de ingreso, registro y recuperación |
| farms, production, inventario, dashboard, alertas, trazabilidad | En implementación |
| iot | MVP frontend (API Django requerida) |

## IoT frontend

La pantalla autenticada está en **IoT** del menú. Consume exclusivamente el cliente REST de Django, que adjunta el Bearer de sesión de `sessionStorage`; el frontend no maneja secretos de coordinators ni conexiones MQTT/SQL.

El contrato IoT no está publicado en este repositorio. El MVP espera estas rutas DRF por defecto:

| Variable | Valor por defecto |
|---|---|
| `VITE_IOT_API_BASE` | `/api/v1/iot` |
| `VITE_IOT_GATEWAYS_PATH` | `${VITE_IOT_API_BASE}/gateways/` |
| `VITE_IOT_COORDINATORS_PATH` | `${VITE_IOT_API_BASE}/coordinators/` |
| `VITE_IOT_SENSORS_PATH` | `${VITE_IOT_API_BASE}/sensors/` |
| `VITE_IOT_READINGS_PATH` | `${VITE_IOT_API_BASE}/readings/` |

Las listas aceptan arrays o paginación DRF (`count`, `next`, `previous`, `results`). Los filtros del historial envían `sensor`, `from`, `to`, `page`, `page_size` y `ordering=-received_at`. Se esperan campos de lectura `sensor_name`, `metric`, `value`, `unit`, `measured_at`/`received_at`, y campos de dispositivo descritos por sus nombres en el frontend. Ajustar rutas/campos cuando el contrato del backend esté disponible; los estados sin evidencia reciente se muestran sin conexión conocida.

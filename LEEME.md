# SIGFAR — Frontend React + Vite · Etapa 5

**Entregable acumulativo**: incluye las etapas 1–4 ya validadas por el estudiante más el módulo de **Solicitudes y Entregas**.

## Compatibilidad

- Backend: **SIGFAR v1.4** (ya validado), sin modificaciones.
- Base de datos: **Oracle XE 21c / XEPDB1**, sin nuevos scripts ni cambios a las 15 tablas.
- Frontend: React 19 + Vite 7 + React Router 7 (Node.js **>= 20.19**).
- Proxy Vite existente: `/api` → `127.0.0.1:3000`; frontend en `127.0.0.1:5173`.
- No se agregaron servicios externos ni módulos fuera del enunciado.

## Instalación en Windows / PowerShell

1. Haz copia de seguridad de tu carpeta de la Etapa 4; descomprime este ZIP en otra carpeta.
2. Mantén el backend v1.4 original conectado a Oracle XE mediante tu archivo `.env`.
3. Abre una terminal en el backend y ejecuta `npm run dev`.
4. Abre otra terminal en esta carpeta y ejecuta:

```powershell
npm install
npm test
npm run build
npm run dev
```

5. Abre `http://127.0.0.1:5173` e inicia sesión con las credenciales de demostración que ya probaste.

**No ejecutes de nuevo los archivos de creación de tablas ni de datos de prueba.** No copies archivos `.env` del backend dentro del frontend. El servidor de Vite resuelve la comunicación `/api` automáticamente durante el desarrollo.

## Qué agrega la Etapa 5

El área **Solicitudes y entregas** (ruta `/solicitudes`) permite:

- Consultar solicitudes existentes, su estado, farmacia asignada, municipio, fechas e indicador de entrega tardía.
- Filtrar por estado y, para administradores y coordinadores, por farmacia asignada.
- Consultar el detalle, medicamentos, cantidades y estado de reservas.
- Como coordinador: registrar una solicitud pendiente, con entre 1 y 20 medicamentos; consultar disponibilidad por departamento y municipio; consultar opciones de la solicitud; confirmar una farmacia elegible y método de pago; cancelar mientras esté pendiente o confirmada; registrar la entrega una vez despachada.
- Como encargado de la sucursal asignada: consultar solicitudes de su sucursal, despachar reservas y registrar entregas despachadas.
- Como administrador: consultar las solicitudes y farmacias elegibles sin modificar operaciones.

**Reglas principales**: la disponibilidad es de lectura; registrar solicitud no reserva inventario; confirmar reserva; despachar descuenta existencias y consume reservas; cancelar antes del despacho libera reservas; entregar registra la finalización. La API vuelve a validar disponibilidad, autorizaciones y cambios de estado.

## Endpoints utilizados

| Acción | Método | Endpoint (relativo a `/api/v1`) | Rol que ejecuta |
|---|---|---|---|
| Listado paginado | GET | `/solicitudes?desde=0&limite=20` | Todos; encargado solo su sucursal |
| Detalle | GET | `/solicitudes/:id` | Usuarios autorizados |
| Disponibilidad | POST | `/solicitudes/disponibilidad` | Coordinador o administrador |
| Registro | POST | `/solicitudes` | Coordinador |
| Opciones de una solicitud | GET | `/solicitudes/:id/opciones` | Coordinador o administrador |
| Confirmación/reserva | POST | `/solicitudes/:id/confirmar` | Coordinador |
| Despacho | POST | `/solicitudes/:id/despachar` | Encargado asignado |
| Entrega | POST | `/solicitudes/:id/entregar` | Coordinador o encargado asignado |
| Cancelación | POST | `/solicitudes/:id/cancelar` | Coordinador |

Los tres últimos endpoints reciben un POST **sin cuerpo JSON**. La confirmación recibe solo `{ "id_sucursal": 1, "forma_pago": "EFECTIVO" }`. El registro recibe datos básicos de cliente, ubicación y detalles con `{ "id_medicamento": n, "cantidad": n }`.

## Uso sugerido de los roles

1. Inicia sesión como **coordinador**, registra una solicitud y, si existe cobertura e inventario, confirma una farmacia elegible.
2. Inicia sesión como **encargado** de la farmacia asignada, abre la solicitud confirmada y presiona **Confirmar despacho**.
3. Inicia sesión como **coordinador** o el encargado asignado para completar la entrega.
4. Inicia sesión como **administrador** y comprueba la consulta general. En la Etapa 6 se añadirá la pantalla de auditoría central.

Para probar cancelaciones, crea otra solicitud pendiente o confirmada que aún no se haya despachado.

## Pruebas

- `npm test`: ejecuta pruebas unitarias y de contrato HTTP (etapas 1–5).
- `npm run build`: compilación de producción de React/Vite.
- `PRUEBAS_MANUALES.md`: verificación en navegador y Oracle XE.
- `VALIDACION_LOCAL.md`: informe de pruebas que se pudieron ejecutar en el entorno de generación.

**Importante**: las pruebas automatizadas del repositorio emplean simuladores de HTTP y verifican validaciones/contratos. No sustituyen las pruebas de interfaz y escritura realizadas con tu Oracle local. Haz esas operaciones con datos ficticios, preferentemente con el esquema QA del proyecto.

## Archivos nuevos o actualizados

- `src/pages/SolicitudesPage.jsx`: pantalla, detalle, disponibilidad, estados y formularios.
- `src/services/solicitudesApi.js`: adaptador de los nueve endpoints existentes.
- `src/utils/solicitudes.js`: permisos, conversiones y validación de datos.
- `src/app/App.jsx`: conexión con la navegación existente.
- `src/styles/global.css`: estilos acotados al módulo.
- `src/layouts/AppLayout.jsx`: leyenda de etapa y progreso.
- `tests/solicitudes.test.js`: 25 nuevos casos de validación y contrato.

## Funcionalidades deliberadamente fuera del alcance

No incluye portal público, telefonía, geolocalización GPS, rutas, cobro de tarjetas, facturación, ajuste de existencias desde la pantalla de entregas, creación de usuarios ni cambios al backend.

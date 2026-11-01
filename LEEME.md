# SIGFAR — Frontend React + Vite · Etapa 6: Auditoría centralizada

**Entrega acumulativa:** etapas 1–5 validadas por el estudiante + módulo final de consulta de auditoría. **No contiene modificaciones del backend ni de la base de datos.**

## Requisitos y compatibilidad

- Backend **SIGFAR v1.4**, Node.js + Express, en `http://127.0.0.1:3000`, conectado a Oracle XE (`XEPDB1`).
- Frontend **React 19 / React Router 7 / Vite 7**. Node.js **20.19 o posterior**.
- Vite mantiene el proxy local `/api` hacia el puerto 3000. No hay conexión directa de React con Oracle.
- No se necesitan credenciales Oracle ni secretos del backend en el frontend.
- Usa los tres endpoints de **solo lectura** del backend existente:

| Operación | Endpoint (base `/api/v1`) | Permisos |
|---|---|---|
| Historial con filtros, paginado y total | `GET /auditoria/registros` | Solo administrador central |
| Resumen por entidad y sucursal | `GET /auditoria/resumen` | Solo administrador central |
| Detalle con valores anteriores/posteriores | `GET /auditoria/registros/:id` | Solo administrador central |

No se crean, actualizan ni eliminan registros de auditoría desde React. El backend sigue aplicando los controles de acceso. No se cambian las **15 tablas** de Oracle XE.

## Actualización segura en Windows / PowerShell

1. Conserva una copia de la carpeta de la Etapa 5, que ya tienes funcionando.
2. Descomprime esta Etapa 6 **en una carpeta diferente**.
3. Conserva la instalación y el `.env` original del backend v1.4; no debes ejecutar los scripts SQL de creación ni los datos de prueba.
4. Inicia el backend en una terminal:

```powershell
cd C:\ruta\SIGFAR_Backend
npm run dev
```

5. En otra terminal, dentro de esta nueva carpeta del frontend, ejecuta:

```powershell
npm install
npm test
npm run build
npm run dev
```

6. Visita `http://127.0.0.1:5173`, inicia sesión como **administrador central** y abre **Auditoría** en el menú lateral. El nombre de la ruta es `/auditoria`.

> Importante: no necesitas copiar archivos manualmente sobre la Etapa 5. Este ZIP incluye el frontend completo acumulativo. Si Vite utiliza otro puerto por configuración local, utiliza la URL que muestre la terminal.

## Funciones agregadas

- Tabla de operaciones con fecha, sucursal, usuario, entidad, acción, registro afectado y enlace para ver el detalle.
- Filtros combinables por sucursal, ID de usuario, entidad, acción, ID de registro afectado, fecha inicial y fecha final.
- Historial ordenado por el backend (más reciente primero), con total real y paginación de 20 filas.
- Resumen de operaciones por entidad y por sucursal, incluidas las operaciones globales sin sucursal.
- Detalle de la operación, con datos anteriores y posteriores, como JSON formateado o texto histórico (si existen). Su presentación es **solo texto**, sin insertar HTML de la bitácora.
- Manejo de respuestas vacías, interrupciones de conexión, errores HTTP y botones de reintento.
- Ruta y menú exclusivos de `ADMIN_CENTRAL`; encargado y coordinador no acceden a la vista ni a sus endpoints.

**Limitaciones deliberadas:** no se incorporan exportación de PDF/Excel, edición de auditoría, eliminación de registros, reportes comerciales ni nuevos filtros del backend. Las opciones de filtrado respetan las admitidas por `construirFiltrosAuditoria()`.

## Validación y evidencias

- `npm test`: tests de regresión de las etapas 1–5 + 26 tests nuevos de auditoría (132 pruebas en total).
- `npm run build`: compilación de producción que **debes ejecutar localmente**.
- `PRUEBAS_MANUALES.md`: casos para validar desde navegador contra tu Oracle XE.
- `VALIDACION_LOCAL.md`: alcance exacto de las comprobaciones ejecutadas al preparar este ZIP.

Los tests usan respuestas HTTP simuladas y no escriben en Oracle. Las verificaciones en navegador y la compilación final quedan para tu equipo, donde ya funciona el backend.

## Archivos nuevos o modificados

- `src/pages/AuditoriaPage.jsx`: pantalla completa de auditoría.
- `src/services/auditoriaApi.js`: cliente de los tres endpoints existentes.
- `src/utils/auditoria.js`: validación de filtros, paginación y presentación segura de datos históricos.
- `tests/auditoria.test.js`: 26 pruebas unitarias y de contrato HTTP nuevas.
- `src/app/App.jsx`: activa el módulo de auditoría.
- `src/components/Icon.jsx`, `src/styles/global.css`: icono de búsqueda y estilos.
- `src/layouts/AppLayout.jsx`, `src/pages/HomePage.jsx`: actualización de la etapa y estado visual.
- `package.json`: versión frontend `0.6.0`.

## Siguiente etapa del plan

**Pruebas integrales de navegador y despliegue en la nube.** Tras tu aprobación de esta pantalla, la fase siguiente comprobará los flujos entre los módulos, probará regresiones y preparará el despliegue con Oracle XE sin abrir públicamente el puerto de la base de datos.

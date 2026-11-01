# SIGFAR — Casos de aceptación · Frontend Etapa 6

**Antes:** backend v1.4 funcionando en 127.0.0.1:3000; frontend en 127.0.0.1:5173; usuario administrador disponible. Estas comprobaciones de auditoría son **solo lectura** y no deben modificar Oracle XE.

| Caso | Pasos | Resultado esperado |
|---|---|---|
| AUD-01 | Acceder como administrador y abrir `/auditoria`. | La pantalla carga historial y resumen desde la API. |
| AUD-02 | Abrir menú como encargado. | No aparece Auditoría. |
| AUD-03 | Abrir `/auditoria` directamente como encargado. | Pantalla de acceso restringido; no se presenta el historial. |
| AUD-04 | Abrir `/auditoria` como coordinador. | Acceso restringido. |
| AUD-05 | Entrar sin iniciar sesión a `/auditoria`. | Solicita autenticación. |
| AUD-06 | Comparar total del historial con `GET /api/v1/auditoria/resumen`. | Totales coherentes para los mismos filtros. |
| AUD-07 | Filtrar por una sucursal con operaciones. | Lista y resumen muestran sus operaciones; se excluyen los registros globales sin sucursal. |
| AUD-08 | Limpiar filtros. | Regresan las operaciones de todas las sucursales, incluidas las globales. |
| AUD-09 | Filtrar `entidad = TRANSFERENCIA`. | Solo aparecen registros cuya entidad es `TRANSFERENCIA`. |
| AUD-10 | Filtrar por la acción de una operación real. | Los resultados coinciden con la acción buscada. |
| AUD-11 | Filtrar por ID de usuario existente. | Los resultados se restringen al responsable. |
| AUD-12 | Filtrar por ID del registro afectado. | Se muestran registros de ese ID; si corresponde a varias entidades, se pueden diferenciar por entidad. |
| AUD-13 | Establecer fecha desde/hasta válidas. | Solo aparecen operaciones del período solicitado. |
| AUD-14 | Introducir un rango de fechas invertido. | Mensaje de validación; no se envía una búsqueda inválida. |
| AUD-15 | Introducir entidad `TRANSFERENCIA;DELETE`. | Mensaje de validación; no se envía una búsqueda inválida. |
| AUD-16 | Aplicar filtros sin coincidencias. | Estado vacío, resumen cero y sin datos inventados. |
| AUD-17 | Consultar historial con más de 20 registros. | Se muestran 20 por página; Anterior/Siguiente funciona y refleja el total. |
| AUD-18 | Abrir detalle de una operación. | Usuario, entidad, acción, fecha, sucursal e ID coinciden con el historial. |
| AUD-19 | Revisar detalle con cambios de estado. | Si la auditoría registró `datos_anteriores` y `datos_nuevos`, se muestran ambos; si son nulos, se indica que no hay datos. |
| AUD-20 | Consultar operación global (sin sucursal). | Se indica expresamente que es una operación global. |
| AUD-21 | Pulsar Actualizar. | Se vuelven a consultar los datos con los filtros vigentes. |
| AUD-22 | Desconectar temporalmente el backend y consultar. | Se muestra error de conexión; Reintentar funciona al reconectar. |
| AUD-23 | Vencer o invalidar el token de la sesión. | El control de sesión redirige al acceso de acuerdo con el comportamiento ya validado. |
| AUD-24 | Inspeccionar la vista. | No hay botones de creación, edición o eliminación de registros de auditoría. |
| AUD-25 | Regresar a transferencias, finanzas y solicitudes. | Las pantallas anteriores continúan funcionando. |

## Referencia para DBeaver (solo lectura)

```sql
SELECT COUNT(*) AS total FROM registro_auditoria;
SELECT entidad, COUNT(*) AS cantidad FROM registro_auditoria GROUP BY entidad ORDER BY cantidad DESC;
SELECT id_sucursal, COUNT(*) AS cantidad FROM registro_auditoria GROUP BY id_sucursal ORDER BY cantidad DESC;
SELECT id_auditoria, entidad, accion, id_registro, fecha_evento
FROM registro_auditoria
ORDER BY fecha_evento DESC, id_auditoria DESC
FETCH FIRST 20 ROWS ONLY;
```

Los totales de SQL corresponden a **todos** los registros. Para compararlos con la UI, limpia los filtros. La API puede mostrar más datos del usuario y de la sucursal porque realiza las uniones necesarias.

## Criterio de aceptación

La Etapa 6 se considera validada después de comprobar con el administrador la carga de historial, resúmenes, filtros y detalles, confirmar los rechazos de otros roles y verificar que los módulos anteriores mantienen su funcionamiento. La aprobación final requiere ejecución real en tu equipo.

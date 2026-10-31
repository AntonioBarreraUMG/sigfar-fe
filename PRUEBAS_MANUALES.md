# SIGFAR — Pruebas manuales de aceptación · Etapa 5

**Requisitos**: backend v1.4 conectado a Oracle XE; frontend Etapa 5; cuentas de los tres roles; datos ficticios; inventario suficiente en al menos una farmacia y un municipio coincidente. Se recomienda un esquema QA para las operaciones de escritura.

## Preparación

1. Verifica la respuesta de `http://127.0.0.1:3000/api/v1/health`.
2. Ejecuta `npm test` y `npm run build` en el frontend.
3. Comprueba que React carga en `http://127.0.0.1:5173`.
4. Identifica una farmacia activa, su departamento/municipio exactos y medicamentos activos disponibles mediante los módulos ya validados.

## Casos de aceptación

| ID | Rol | Acción | Resultado esperado |
|---|---|---|---|
| S-01 | Administrador | Entrar en Solicitudes | Se muestra la lista sin botones de escritura. |
| S-02 | Coordinador | Entrar en Solicitudes | Aparece **Nueva solicitud**. |
| S-03 | Encargado | Entrar en Solicitudes | Solo ve solicitudes asignadas a su farmacia. |
| S-04 | Coordinador | Registrar cliente, municipio y 2 medicamentos activos | Se crea una solicitud `PENDIENTE`; no se descuenta ni reserva inventario. |
| S-05 | Coordinador | Usar **Consultar disponibilidad** con inventario suficiente | Muestra sucursal elegible y tiempo de entrega configurado. |
| S-06 | Coordinador | Consultar disponibilidad sin cobertura | Mensaje indicando que no hay farmacias elegibles; no se crean reservas. |
| S-07 | Coordinador | Registrar 2 renglones del mismo medicamento | El formulario rechaza la solicitud. |
| S-08 | Coordinador | Registrar cantidad cero o fraccionaria | Rechazo de validación sin petición de escritura. |
| S-09 | Coordinador | Registrar medicamento inactivo | No se ofrece para seleccionar; no se puede enviar. |
| S-10 | Coordinador | Abrir detalle pendiente y sus opciones | Se ven sucursales elegibles, método de pago y acción de confirmar. |
| S-11 | Coordinador | Confirmar con efectivo/tarjeta y sucursal elegible | Estado `CONFIRMADA`; se generan reservas sin descontar existencias. |
| S-12 | Coordinador | Confirmar de nuevo una solicitud ya confirmada | Acción no disponible; el servidor rechaza un intento externo duplicado. |
| S-13 | Encargado de otra sucursal | Intentar consultar o despachar la solicitud | Acceso denegado por el backend. |
| S-14 | Encargado asignado | Despachar solicitud confirmada | Estado `DESPACHADA`; las reservas se consumen y el inventario existente se descuenta una vez. |
| S-15 | Encargado asignado | Intentar segundo despacho | No hay botón habilitado; una repetición HTTP se rechaza. |
| S-16 | Coordinador o encargado asignado | Marcar solicitud despachada como entregada | Estado `ENTREGADA` y fecha real registrada. |
| S-17 | Coordinador | Cancelar una solicitud pendiente | Estado `CANCELADA`, sin inventario comprometido. |
| S-18 | Coordinador | Cancelar una solicitud confirmada sin despacho | Estado `CANCELADA` y reservas liberadas. |
| S-19 | Coordinador | Intentar cancelar una solicitud despachada | Acción no disponible; el backend lo rechaza. |
| S-20 | Administrador | Filtrar por estado y farmacia | Resultados consistentes con el backend, paginados. |
| S-21 | Coordinador | Ver detalle de solicitud tardía (si existe) | Se muestra el indicador tardía según valor devuelto por Oracle. |
| S-22 | Todos | Recargar la página o cambiar de módulo | La sesión se verifica y los registros vuelven a consultarse. |
| S-23 | Todos | Interrumpir temporalmente Node.js | Aparece error de conexión sin declarar una operación exitosa. |
| S-24 | Todos | Revisar las vistas de etapas 1–4 | Continúan operativas las funciones ya validadas. |
| S-25 | Coordinador | Cambiar un medicamento después de consultar disponibilidad | Se invalida la previsualización anterior; requiere una nueva consulta. |
| S-26 | Administrador | Ver detalle de solicitud confirmada | Puede leer pago, fechas, medicamentos y estado de reservas sin cambiar datos. |

## Verificaciones SQL orientativas en DBeaver

Tras ejecutar operaciones con datos ficticios, consulta los registros por su ID:

```sql
SELECT id_solicitud, estado, id_sucursal_asignada, forma_pago,
       fecha_estimada_entrega, fecha_despacho, fecha_entrega_real
FROM solicitud_entrega WHERE id_solicitud = :id_solicitud;

SELECT d.id_medicamento, d.cantidad, r.estado AS estado_reserva,
       r.cantidad AS cantidad_reservada
FROM detalle_solicitud d
LEFT JOIN reserva_inventario r ON r.id_detalle_solicitud = d.id_detalle_solicitud
WHERE d.id_solicitud = :id_solicitud;

SELECT id_movimiento, tipo, cantidad, id_sucursal, id_medicamento
FROM movimiento_inventario
WHERE id_detalle_solicitud IN (
  SELECT id_detalle_solicitud FROM detalle_solicitud WHERE id_solicitud = :id_solicitud
);
```

DBeaver solicitará el valor de `:id_solicitud`. Estas son consultas de **solo lectura**. El historial de auditoría puede revisarse igualmente desde la tabla `REGISTRO_AUDITORIA` hasta que esté disponible la pantalla de la Etapa 6.

**Aceptación**: considera validada la Etapa 5 solo cuando la compilación y los flujos operativos relevantes se hayan comprobado desde el navegador conectado a tu backend y Oracle XE reales.

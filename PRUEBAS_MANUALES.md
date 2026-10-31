# SIGFAR — Pruebas funcionales manuales · Frontend Etapa 3

Realiza las pruebas de escritura **solo en un entorno de demostración o QA** y con datos ficticios. Mantén un respaldo de los datos iniciales. Todas las peticiones ejecutadas desde React se registran en el backend contra Oracle XE.

## Preparación

- Backend v1.4 funcionando (`/api/v1/health` responde correctamente).
- Frontend Etapa 3 iniciado en `http://127.0.0.1:5173`.
- Un administrador y dos encargados asignados a sucursales distintas.
- Un medicamento activo con existencias disponibles suficientes en la sucursal de origen.
- Anotar desde el administrador el ID de la sucursal destino que esté activa (pantalla *Sucursales*).

## Escenarios

| ID | Usuario y acción | Resultado esperado |
|---|---|---|
| T01 | Administrador entra en Transferencias | Ve historial de toda la empresa, filtros por sucursal/estado y detalle; no ve botón «Nueva transferencia». |
| T02 | Encargado de origen entra en Transferencias | Ve únicamente transferencias en las que participa su sucursal. |
| T03 | Coordinador intenta visitar `/transferencias` | Recibe pantalla «Sin acceso»; no aparece la opción en su menú. |
| T04 | Encargado crea una transferencia con origen propio, ID destino distinto y medicamento activo | Se obtiene nueva transferencia `REGISTRADA`, con detalle correcto. No cambia el inventario todavía. |
| T05 | Encargado intenta usar mismo medicamento dos veces | Validación local rechaza el registro sin envío HTTP. |
| T06 | Encargado usa destino igual a origen o cantidad fraccionaria/cero | Validación local rechaza. |
| T07 | Encargado usa ID de sucursal destino inexistente/inactiva | El backend rechaza la solicitud y se muestra el mensaje de error. |
| T08 | Encargado de origen despacha una transferencia registrada | Se solicita confirmación. Al aceptar queda `EN_TRANSITO` y disminuye el inventario del origen. |
| T09 | Usuario cancela la confirmación de despacho | No se realiza petición ni se modifican existencias. |
| T10 | Encargado del origen intenta recibir una transferencia | No se muestra el botón «Confirmar recepción». |
| T11 | Encargado de destino accede a la misma transferencia en tránsito | Ve botón «Confirmar recepción», y no ve «Confirmar despacho». |
| T12 | Encargado de destino confirma la recepción | El estado es `RECIBIDA` y aumenta inventario de destino. |
| T13 | Consultar la transferencia ya recibida | No hay botones de despacho o recepción; no existe doble recepción desde interfaz. |
| T14 | Intentar despachar una cantidad superior al disponible | El backend rechaza la operación (conflicto); estado e inventario no cambian. |
| T15 | Cambiar filtro por estado y navegar páginas | Los resultados coinciden; «Actualizar» recarga los registros. |
| T16 | Abrir detalle desde historial | Muestra origen, destino, estado, fechas, medicamentos y cantidades. |
| T17 | Navegar a Sucursales, Medicamentos e Inventarios | Se mantienen operativos los módulos ya validados de la Etapa 2. |
| T18 | Cerrar sesión y recargar navegador | Protecciones de sesión y navegación siguen funcionando. |

## Consultas de comprobación en DBeaver (opcional)

Para la transferencia creada en T04, sustituye `123` por su identificador real y consulta:

```sql
SELECT id_transferencia, id_sucursal_origen, id_sucursal_destino,
       estado, fecha_registro, fecha_despacho, fecha_recepcion
FROM transferencia
WHERE id_transferencia = 123;

SELECT id_transferencia, id_medicamento, cantidad
FROM detalle_transferencia
WHERE id_transferencia = 123;

SELECT id_sucursal, id_medicamento, cantidad_existente, cantidad_reservada
FROM inventario_sucursal
WHERE id_medicamento = 1
ORDER BY id_sucursal;
```

El último `id_medicamento = 1` es solo un ejemplo: reemplázalo por el medicamento utilizado realmente. Puedes volver a ejecutar `03_verificacion.sql` de las pruebas SQL de SIGFAR, teniendo en cuenta que algunas comparaciones con cantidades iniciales exactas dejarán de representar el conjunto original después de nuevas transferencias; utiliza en su lugar las conciliaciones que calculan saldos a partir de movimientos.

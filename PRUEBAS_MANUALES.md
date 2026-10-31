# SIGFAR — Pruebas funcionales manuales — Etapa 4

Utiliza datos ficticios, preferiblemente en el esquema `SIGFAR_QA`. Ejecuta las comprobaciones con el backend v1.4 y React Etapa 4.

## Instalación y regresión (sin escrituras)

- [ ] `npm test` finaliza con 81 pruebas aprobadas.
- [ ] `npm run build` finaliza sin errores.
- [ ] Inicio de sesión de administrador, encargado y coordinador funciona como en Etapa 3.
- [ ] Se conservan las páginas de sucursales, medicamentos, inventarios y transferencias.
- [ ] El coordinador no ve ni puede abrir `/efectivo`, `/planillas` o `/activos`.
- [ ] El administrador abre las tres páginas y ve datos consolidados de varias farmacias.
- [ ] El administrador NO ve botones de nuevo registro ni de edición en estas páginas.
- [ ] El encargado solo consulta sus datos y ve botones para registrar y corregir donde corresponda.

## Efectivo

- [ ] Como administrador, los filtros de sucursal, tipo y fechas modifican tabla y resumen.
- [ ] El desglose por sucursal coincide con el resumen de la API `GET /api/v1/efectivo/resumen`.
- [ ] Como encargado, registrar `INGRESO`, monto `125.50`, concepto ficticio: se crea registro.
- [ ] Registrar `EGRESO`, monto `25.25`: el flujo neto refleja la diferencia.
- [ ] Intentar registrar monto `0`, `-2`, `1,20` o `10.555`: el formulario impide enviar.
- [ ] Ver detalle de un movimiento muestra tipo, sucursal, fecha, usuario, concepto y monto.
- [ ] No hay botones para editar o eliminar movimientos de efectivo.

## Planillas

- [ ] Como administrador, filtrar por sucursal y períodos muestra los importes correctos.
- [ ] Como encargado, registrar planilla para un **período nuevo**, por ejemplo `2027-08`, con monto `1200.00`.
- [ ] Repetir el mismo período/sucursal: la API rechaza el duplicado; React muestra su mensaje y no informa éxito.
- [ ] Corregir solo el monto de esa planilla a `1500.20`; la tabla y el resumen se actualizan.
- [ ] Intentar un período inválido o un valor con más de dos decimales: validación de formulario.
- [ ] Verificar en auditoría, como administrador, la acción `CORREGIR` sobre `GASTO_PLANILLA`.

## Activos fijos

- [ ] El administrador filtra por sucursal, `VIGENTE` y `BAJA`, y el resumen muestra siempre **activos vigentes**.
- [ ] El encargado registra un activo ficticio con código único, descripción y valor `2500.00`.
- [ ] Modificar descripción y valor a `2400.00`; comprobar que el resumen refleja el nuevo valor.
- [ ] Cambiar estado a `BAJA`; el activo aparece al filtrar bajas y deja de contar en valor de vigentes.
- [ ] La tabla y resumen muestran quetzales con dos decimales.
- [ ] Confirmar en auditoría la operación `MODIFICAR` y los datos anteriores/posteriores.

## Integridad y errores

- [ ] Si el backend se detiene temporalmente, las vistas muestran error de conexión y ofrecen actualizar.
- [ ] Con token vencido, React vuelve a pantalla de acceso sin mostrar información protegida.
- [ ] Una operación rechazada por la API (403, 409 o 400) muestra error y no indica éxito.
- [ ] Tras guardar, los resúmenes se actualizan junto con los listados.
- [ ] DBeaver confirma los registros creados en `MOVIMIENTO_EFECTIVO`, `GASTO_PLANILLA` y `ACTIVO_FIJO` y sus correspondientes entradas de `REGISTRO_AUDITORIA`.

**Nota:** no ejecutes nuevamente los scripts de carga inicial de Oracle. Evita repetir la prueba de planilla con el mismo período a menos que quieras comprobar explícitamente la restricción de duplicado.

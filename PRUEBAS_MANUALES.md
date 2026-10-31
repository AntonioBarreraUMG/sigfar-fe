# Casos de aceptación local — Frontend Etapa 2

Usa datos de demostración o un esquema de QA para las pruebas con escritura. El objetivo es comprobar la UI real conectada al backend v1.4, sin reejecutar los scripts de carga originales.

## Autenticación y navegación (regresión Etapa 1)

1. `ADMIN_CENTRAL`: iniciar sesión, recargar página, entrar a `/sucursales`, `/medicamentos`, `/inventarios` y cerrar sesión.
2. `ENCARGADO`: iniciar sesión y comprobar que su menú no muestra auditoría centralizada.
3. `COORD_ENTREGAS`: iniciar sesión y comprobar que no tiene acceso a transferencias ni movimientos de inventario.
4. Intentar visitar un módulo sin autorización directamente mediante la URL: debe mostrarse «Sin acceso».

## Sucursales

5. Como administrador, listar sucursales desde Oracle; filtrar Activas/Inactivas y usar Actualizar.
6. Crear una sucursal ficticia con código nuevo, departamento/municipio y tiempo válido; verificar que aparece en la lista y en DBeaver.
7. Editar nombre/tiempo de esa sucursal; comprobar que cambia en pantalla y que el backend registra auditoría.
8. Intentar tiempo fraccionario/negativo y código demasiado largo: debe rechazarse antes de llamar a la API.
9. Como encargado, consultar solo la sucursal asignada; comprobar ausencia de botones Crear y Editar.
10. Como coordinador, consultar sucursales y verificar ausencia de operaciones de escritura.

## Medicamentos

11. Como administrador, listar medicamentos y filtrar activos/inactivos.
12. Crear un medicamento ficticio con código nuevo y presentación; confirmar persistencia.
13. Editar su nombre o estado; confirmar persistencia y auditoría.
14. Repetir el código en otro medicamento: debe mostrarse el error de Oracle/backend sin bloquear la interfaz.
15. Como encargado o coordinador, consultar el catálogo sin opciones de modificación.

## Inventario

16. Como administrador, observar existente, reservado y disponible para diferentes farmacias; cambiar filtros por sucursal/medicamento y comprobar valores en DBeaver.
17. Como coordinador, consultar existencias sin acceso a historial ni botón Registrar movimiento.
18. Como encargado, comprobar que solo aparece el inventario de su sucursal.
19. Registrar `INICIAL` para el medicamento ficticio de la prueba 12 (que no tenga inventario en la sucursal de prueba). Comprobar `POST /inventarios/movimientos` y actualización del saldo.
20. Registrar `AJUSTE_ENTRADA` con motivo y comprobar aumento de existencias.
21. Registrar `AJUSTE_SALIDA` con motivo y cantidad disponible; comprobar disminución.
22. Intentar salida superior a las unidades disponibles; debe devolver conflicto y las existencias no deben variar.
23. Intentar un segundo `INICIAL` en la misma sucursal y medicamento: debe devolver conflicto.
24. Consultar Historial de movimientos y confirmar tipo, cantidad, motivo y fecha correctos.
25. Intentar ajuste sin motivo o cantidad decimal: debe mostrarse un mensaje de validación.
26. Repetir consultas/paginación: no deben borrarse registros ni inventarse valores de conteo general.
27. Desconectar temporalmente el backend, pulsar Actualizar: debe mostrarse error y opción Reintentar.

## Revisión de resultados en DBeaver

Consulta las tablas `SUCURSAL`, `MEDICAMENTO`, `INVENTARIO_SUCURSAL`, `MOVIMIENTO_INVENTARIO` y `REGISTRO_AUDITORIA` por los códigos/IDs de prueba para confirmar los resultados. Utiliza también las consultas de conciliación incluidas en el paquete de pruebas del backend v1.4.

## Criterio de aceptación

No debe fallar ninguna operación crítica de consulta, creación/modificación autorizada o registro de movimiento. La autenticación y los permisos deben continuar funcionando como en la Etapa 1.

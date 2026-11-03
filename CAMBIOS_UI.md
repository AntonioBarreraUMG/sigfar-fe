# SIGFAR — Ajustes visuales solicitados

| Solicitud | Implementación | Cobertura |
|---|---|---|
| Indicadores de carga de datos dinámicos | `LoadingIndicator` compartido y estados de carga | Tablas, catálogos, detalles, resúmenes, consulta de disponibilidad, sesión y acceso |
| Sustituir tarjetas abiertas por modales | `DataPanel` montado dentro de `Modal` con portal, foco, Escape y scroll | Formularios y detalles de todas las áreas funcionales |
| Confirmaciones con modales | `useConfirmation` + `ConfirmDialog` | Despacho/recepción de transferencias, confirmación, despacho, entrega y cancelación de solicitudes |
| Campos claramente de solo lectura | `ReadOnlyField`, `ReadOnlyNotice`, estilos uniformes | Sucursal asignada, datos históricos, período de planilla, código de activo y demás detalles |

**Sin cambios:** esquema Oracle XE, autenticación, roles, API REST, reglas de negocio y flujo de transacciones.

**Pruebas funcionales nuevas:** ninguna; la validación funcional se realiza en el entorno del estudiante.

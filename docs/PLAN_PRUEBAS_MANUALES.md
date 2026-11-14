# SIGFAR — Plan general de pruebas manuales

**Versión del documento:** 1.0  
**Fecha:** 8 de noviembre de 2026  
**Tipo:** Validación de cierre del desarrollo  
**Sistema:** SIGFAR — Sistema Integral de Gestión de Farmacias  
**Entorno objetivo:** Aplicación desplegada en Google Cloud Platform (GCP)

## 1. Objetivo

Comprobar manualmente que SIGFAR funciona de manera integral, que cada módulo realiza sus operaciones principales y que los tres roles del sistema tienen acceso únicamente a las funciones autorizadas. Este plan sirve como referencia para la aceptación de la versión desarrollada y para futuras comprobaciones después de correcciones o actualizaciones.

Se evalúan las funciones que forman parte de la implementación actual. **No se pretende probar exhaustivamente cada combinación de datos ni realizar pruebas de carga, penetración o de infraestructura avanzada.**

## 2. Alcance y entorno

Componentes a validar:

- **Frontend:** aplicación React desplegada en GCP.
- **Backend:** API REST Node.js + Express desplegada en GCP.
- **Base de datos:** Oracle XE, con persistencia de las operaciones.
- **Módulos:** autenticación, usuarios, sucursales, medicamentos, inventario, transferencias, efectivo, planillas, activos fijos, solicitudes/entregas y auditoría.
- **Interfaz:** indicadores de carga, modales, confirmaciones, campos de solo lectura y listas de selección.

**Preparación:** disponer de un usuario de prueba por rol (administrador central, encargado de sucursal y coordinador de entregas), al menos dos sucursales activas, medicamentos con existencias y datos ficticios para registrar operaciones. Utilizar preferentemente un entorno o conjunto de datos de prueba; antes de modificar información compartida, guardar una copia de seguridad y evitar el uso de datos personales reales.

Se necesitará un navegador moderno y acceso a la URL de SIGFAR. DBeaver puede utilizarse de manera opcional para contrastar registros en Oracle, pero la aceptación se realiza principalmente desde la interfaz web.

## 3. Roles y permisos esperados

| Rol                         | Funciones principales autorizadas                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Administrador central**   | Gestionar usuarios, sucursales y catálogo de medicamentos; consultar información consolidada de inventarios, transferencias, efectivo, planillas, activos, solicitudes y auditoría.              |
| **Encargado de sucursal**   | Consultar datos autorizados de su farmacia; registrar ajustes de inventario, gestionar transferencias de origen/destino, registrar efectivo, planillas y activos, y procesar entregas asignadas. |
| **Coordinador de entregas** | Consultar datos necesarios para preparar pedidos; registrar, confirmar y cancelar solicitudes, elegir farmacia disponible y dar seguimiento a entregas.                                          |

Los permisos definitivos son los aplicados por el backend. En particular, el administrador central **no** realiza por defecto movimientos operativos propios de un encargado, y el coordinador **no** administra inventario, efectivo, planillas ni activos.

## 4. Casos de prueba manuales

Para cada caso, ejecutar la acción indicada, comparar con el resultado esperado y registrar **Aprobado**, **Fallido** o **No aplica** (con explicación).

### A. Acceso, usuarios y permisos

| ID        | Comprobación manual                                                                                  | Resultado esperado                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **PM-01** | Iniciar sesión con una cuenta válida de cada uno de los tres roles.                                  | Acceso correcto y menú acorde con el rol y la sucursal asignada.                                                 |
| **PM-02** | Intentar acceder con credenciales incorrectas; cerrar sesión y volver a abrir la aplicación.         | Credenciales inválidas rechazadas; al cerrar sesión no se accede a pantallas protegidas.                         |
| **PM-03** | Como administrador, crear un usuario, modificar su rol/sucursal y restablecer su contraseña.         | Datos actualizados; la nueva contraseña permite iniciar sesión y la anterior deja de servir para nuevos accesos. |
| **PM-04** | Desactivar y reactivar un usuario; intentar desactivar al último administrador activo o a uno mismo. | Una cuenta desactivada no puede operar; las restricciones de protección del administrador se cumplen.            |
| **PM-05** | Con encargado y coordinador, intentar abrir módulos o ejecutar acciones reservadas al administrador. | La interfaz restringe las opciones y el servidor deniega accesos no autorizados.                                 |

### B. Catálogos e inventario

| ID        | Comprobación manual                                                                                                       | Resultado esperado                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **PM-06** | Como administrador, registrar y modificar una sucursal, eligiendo departamento y municipio.                               | Sucursal guardada; el municipio corresponde al departamento seleccionado.                    |
| **PM-07** | Como administrador, registrar y modificar un medicamento.                                                                 | El catálogo refleja los cambios; otros roles solo realizan las consultas permitidas.         |
| **PM-08** | Consultar inventario por sucursal y medicamento con los distintos roles.                                                  | Se muestran cantidades **existentes, reservadas y disponibles** coherentes con sus permisos. |
| **PM-09** | Como encargado, registrar un movimiento inicial o ajuste de entrada/salida; intentar una salida superior a lo disponible. | Los saldos se actualizan y el movimiento queda registrado; la salida inválida se rechaza.    |

### C. Transferencias entre sucursales

| ID        | Comprobación manual                                                                                  | Resultado esperado                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **PM-10** | Como encargado de origen, registrar una transferencia seleccionando sucursal destino y medicamentos. | Transferencia creada en estado **REGISTRADA**, sin descontar aún el inventario.                                    |
| **PM-11** | Despachar la transferencia y recibirla con el encargado de destino.                                  | Cambia a **EN_TRANSITO** y después **RECIBIDA**; el origen disminuye al despachar y el destino aumenta al recibir. |
| **PM-12** | Intentar repetir despacho/recepción o transferir más unidades de las disponibles.                    | El sistema impide duplicados e inventario insuficiente; no se alteran saldos indebidamente.                        |

### D. Administración y finanzas

| ID        | Comprobación manual                                                                   | Resultado esperado                                                                         |
| --------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **PM-13** | Registrar un ingreso y un egreso de efectivo desde una sucursal; consultar resúmenes. | Movimientos y flujo neto correctos para la sucursal y en el consolidado del administrador. |
| **PM-14** | Registrar un gasto de planilla por período y corregir su monto.                       | Total actualizado, sin duplicar el período; la corrección queda registrada para auditoría. |
| **PM-15** | Registrar un activo fijo, modificar su información y marcarlo de baja.                | El activo conserva su historial y el valor de activos vigentes se actualiza correctamente. |
| **PM-16** | Intentar modificar desde otra sucursal o con un rol no autorizado.                    | Operación rechazada; los datos originales permanecen sin cambios.                          |

### E. Solicitudes y entregas

| ID        | Comprobación manual                                                                                      | Resultado esperado                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **PM-17** | Como coordinador, registrar una solicitud con medicamentos, departamento, municipio y dirección.         | Solicitud creada en estado **PENDIENTE** y datos de ubicación guardados.                                         |
| **PM-18** | Consultar farmacias elegibles; confirmar una solicitud, forma de pago y farmacia.                        | Solo se muestran opciones con cobertura y existencias; se obtiene el tiempo estimado y se reservan las unidades. |
| **PM-19** | Como encargado de la sucursal asignada, despachar; luego registrar la entrega con un usuario autorizado. | Estado pasa a **DESPACHADA** y **ENTREGADA**; inventario y reservas se actualizan sin duplicados.                |
| **PM-20** | Cancelar otra solicitud antes del despacho.                                                              | Estado **CANCELADA**; se liberan las unidades reservadas.                                                        |
| **PM-21** | Solicitar cantidades insuficientes o una entrega sin sucursal elegible.                                  | No se confirma una entrega imposible; el sistema informa la razón.                                               |

### F. Auditoría, interfaz e integración

| ID        | Comprobación manual                                                                                         | Resultado esperado                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **PM-22** | Como administrador, filtrar auditoría por usuario, sucursal, entidad, acción o fecha; abrir un detalle.     | Resultados correctos y trazabilidad disponible, incluidos valores anteriores/posteriores cuando existan.              |
| **PM-23** | Abrir formularios, detalles y confirmaciones; observar cargas y campos no editables.                        | Se usan modales, aparecen indicadores durante las consultas, y los campos de solo lectura se distinguen claramente.   |
| **PM-24** | Revisar selectores de sucursales, roles, medicamentos, departamentos y municipios; cambiar el departamento. | Las opciones provienen del catálogo correspondiente; el municipio se actualiza y se limpia si cambia el departamento. |
| **PM-25** | Realizar una operación desde la URL de GCP, actualizar la página y volver a consultar el registro.          | La aplicación funciona sobre HTTPS, se comunica con el backend y conserva los datos en Oracle XE.                     |

## 5. Registro de resultados

Se recomienda llevar una tabla o incidencia en el repositorio con el siguiente formato:

| ID de prueba | Resultado (Aprobado / Fallido / No aplica) | Responsable | Fecha | Observaciones o evidencia |
| ------------ | ------------------------------------------ | ----------- | ----- | ------------------------- |
| PM-01        |                                            |             |       |                           |

Para una prueba fallida, registrar como mínimo: **ID, resultado observado, resultado esperado, pasos breves para reproducir y captura o mensaje de error**. Si se abre una incidencia, vincularla con el caso correspondiente. No incluir contraseñas, tokens ni secretos en capturas o reportes.

## 6. Criterios de aceptación y cierre

Se considera completada la validación manual de cierre cuando:

1. Los **25 casos** se hayan revisado y tengan un resultado registrado.
2. No existan fallos abiertos que impidan operar los módulos principales o violen los permisos de los roles.
3. Los flujos de **inventario, transferencia, efectivo, planilla, activos, solicitudes/entregas y auditoría** sean coherentes de extremo a extremo.
4. El sistema sea accesible en **GCP** y conserve los cambios realizados al volver a consultar la información.
5. Los hallazgos menores, si los hubiera, estén documentados con una decisión explícita sobre su resolución.

**Resultado final de la validación:** Pendiente de registrar. Este documento define el plan; no certifica por sí solo que los casos fueron ejecutados.

## 7. Cierre del desarrollo y mantenimiento futuro

Con la aceptación de estas verificaciones, SIGFAR se considera **desarrollado y validado para el alcance académico definido**. Este cierre no impide realizar modificaciones posteriores.

Las futuras **correcciones de errores, mejoras de usabilidad, ajustes de seguridad o ampliaciones funcionales** deberán registrarse como incidencias o solicitudes de cambio en el repositorio, describiendo su motivo, alcance y archivos afectados. Cada cambio se revisará y validará antes de publicarse, repitiendo los casos de este plan que puedan verse afectados.

---

**Aprobación de cierre**

- **Versión de SIGFAR evaluada:** ____________________
- **Entorno / URL evaluada:** ____________________
- **Responsable de la validación:** ____________________
- **Fecha de validación:** ____________________
- **Resultado general:** Aprobado / Aprobado con observaciones / No aprobado
- **Referencia a incidencias pendientes (si aplica):** ____________________

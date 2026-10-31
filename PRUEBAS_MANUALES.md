# Casos de aceptación — Frontend, etapa 1

Pruebas de navegador con el **backend v1.4 validado y Oracle XE activos**. Los datos de cuenta dependen de tu instancia de demostración. Las pruebas no ejecutan escrituras de negocio.

| ID | Procedimiento | Resultado esperado |
|---|---|---|
| FE01 | Abrir `/` sin token | Redirige a `/acceso` y muestra formulario |
| FE02 | Intentar inicio de sesión sin correo o clave | Muestra error de validación en el formulario |
| FE03 | Enviar credenciales inválidas | Mensaje de error del backend, sin crear sesión |
| FE04 | Iniciar sesión como `ADMIN_CENTRAL` | Navega al inicio; usuario y rol aparecen en cabecera |
| FE05 | Consultar el menú como administrador | Nueve módulos, incluida auditoría |
| FE06 | Iniciar sesión como `ENCARGADO` | Ocho módulos, sin auditoría centralizada |
| FE07 | Iniciar sesión como `COORD_ENTREGAS` | Cuatro módulos: sucursales, medicamentos, inventarios y solicitudes |
| FE08 | Con coordinador, abrir directamente `/auditoria` | Página “No tienes permiso” |
| FE09 | Recargar con sesión válida | Revalida con `/auth/me` y conserva el usuario autenticado |
| FE10 | Cerrar sesión y abrir `/` | Solicita volver a iniciar sesión |
| FE11 | Tener token guardado, apagar backend y recargar | Mensaje de conexión y botón Reintentar; no muestra contenido protegido |
| FE12 | Reencender backend y pulsar Reintentar | Revalida y vuelve al inicio autenticado |
| FE13 | Seleccionar cualquier módulo del menú | Página honesta de “Interfaz pendiente de desarrollo” |
| FE14 | Abrir el resumen con backend operativo | Indicador “API HTTP operativa” (únicamente HTTP) |
| FE15 | Abrir el proyecto en ancho reducido | Menú adaptable y formulario utilizable |

La etapa se considera validada si estos casos pasan en tu máquina y `npm test` + `npm run build` terminan sin errores.

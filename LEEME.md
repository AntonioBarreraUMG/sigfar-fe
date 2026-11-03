# SIGFAR — Frontend React · Etapa 7 (ajustes de interfaz e integración)

Esta entrega es **acumulativa**: contiene las nueve áreas funcionales de la Etapa 6 más los ajustes de interfaz solicitados. No se modifican el backend **v1.4**, sus contratos HTTP, permisos ni las **15 tablas** de Oracle XE.

## Requisitos

- Node.js 20.19 o posterior.
- Backend SIGFAR v1.4 ejecutándose en `http://127.0.0.1:3000` y conectado a Oracle XE, servicio `XEPDB1`.
- Vite sirve el frontend en `http://127.0.0.1:5173` y redirige `/api` al backend. No añadas credenciales Oracle al frontend.

## Actualización segura

1. Conserva la Etapa 6 que ya validaste y **descomprime este ZIP en otra carpeta**.
2. No reemplaces el backend y conserva su archivo `.env`. No recrees el esquema ni repitas la carga de datos SQL.
3. Abre dos terminales PowerShell:

**Terminal del backend:**

```powershell
cd C:\ruta\SIGFAR_Backend
npm run dev
```

**Terminal del frontend actualizado:**

```powershell
cd C:\ruta\SIGFAR_Frontend_Etapa7_UI
npm install
npm run dev
```

4. Abre `http://127.0.0.1:5173`, inicia sesión normalmente y recorre los módulos disponibles según tu rol.
5. Para generar una compilación de producción, cuando la necesites: `npm run build`.

## Ajustes aplicados

### Indicadores de carga

- El componente `LoadingIndicator` se utiliza mientras las tablas consultan datos, se recuperan detalles, se buscan catálogos y se actualizan resúmenes.
- También se muestra al comprobar la sesión, el estado HTTP y durante la autenticación; se utiliza un indicador en la consulta previa de disponibilidad.
- Los indicadores tienen `role="status"` y un texto que describe lo que se está consultando.

### Formularios y detalles en modales

- `DataPanel` dejó de ser una tarjeta dentro de la página: ahora utiliza `Modal` mediante un portal React, sin modificar los formularios ni los endpoints existentes.
- Los formularios y detalles de **Sucursales, Medicamentos, Inventarios, Transferencias, Efectivo, Planillas, Activos, Solicitudes y Auditoría** se abren sobre la pantalla.
- El modal bloquea el desplazamiento de fondo, traslada el foco al diálogo, conserva Tab dentro del mismo, admite Escape cuando no hay escritura en curso y devuelve el foco al control anterior al cerrar.
- Los modales amplios desplazan su contenido verticalmente en pantallas pequeñas. No se crean nuevas rutas ni formularios.

### Confirmación con modal

- Se sustituyeron todos los usos existentes de `window.confirm` en **Transferencias** y **Solicitudes/Entregas** por el diálogo `ConfirmDialog`.
- La confirmación solo realiza la petición HTTP después de aceptar. La cancelación o Escape no ejecuta la acción.
- En las confirmaciones de anulación se muestra un botón con estilo de advertencia.

### Campos de solo lectura

- Se incorporó `ReadOnlyField` para los campos no editables, con fondo diferenciado, borde discontinuo, icono de candado y etiqueta «Solo lectura».
- Los detalles históricos muestran una indicación equivalente y estilos consistentes.
- La sucursal asignada al encargado se presenta como valor no editable, en lugar de aparentar ser un selector modificable.
- En las correcciones de planilla se distingue el período no modificable del importe editable; en la edición de activos se distingue el código no modificable.

## Alcance y límites

- **Sin nuevas pruebas funcionales:** se conservan los archivos de pruebas existentes en la entrega acumulativa, pero no se añadieron casos nuevos ni se realizó una batería funcional para esta modificación, según lo solicitado.
- Se revisó **sintaxis** del código JS/JSX e importaciones relativas de forma estática. La compilación de Vite y la comprobación visual en tu equipo quedan para tu revisión habitual.
- Esta entrega no implementa servicios de nube ni cambia la infraestructura de la API. El siguiente trabajo técnico será preparar y ejecutar el despliegue en la nube, según el enunciado universitario.

## Componentes nuevos o cambiados

- **Nuevos:** `src/components/Modal.jsx`, `ConfirmDialog.jsx`, `LoadingIndicator.jsx`.
- **Modificados:** `DataUI.jsx`, `AdminUI.jsx`, `LoadingScreen.jsx`, pantallas de los nueve módulos, `LoginPage.jsx`, `HomePage.jsx` y `src/styles/global.css`.

La aplicación sigue utilizando React + Vite, el backend Node.js + Express validado y Oracle XE, sin añadir módulos de negocio ni funciones ajenas al prototipo académico.

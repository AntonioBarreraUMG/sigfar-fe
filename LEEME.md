# SIGFAR — Frontend React / Etapa 2: Sucursales, Medicamentos e Inventarios

**Prototipo académico Universidad Mariano Gálvez de Guatemala.** Actualización acumulativa de la Etapa 1, con autenticación, navegación por rol y las tres primeras áreas funcionales. Compatible con **SIGFAR Backend v1.4 + Oracle XE (`XEPDB1`)**, sin cambios al backend o a las 15 tablas.

## Qué se ha implementado

| Módulo | Consulta | Escritura | Permisos |
|---|---|---|---|
| Sucursales | Listar, filtrar por estado, páginas de 20 | Crear y editar | Los tres roles consultan. Solo `ADMIN_CENTRAL` escribe. El encargado solo puede consultar su sucursal, como fija la API. |
| Medicamentos | Listar, filtrar activos, páginas de 20 | Crear y editar | Los tres roles consultan. Solo `ADMIN_CENTRAL` escribe. |
| Inventarios | Consultar saldos existente/reservado/disponible; filtrar por sucursal/medicamento | Inventario inicial y ajustes de entrada/salida | Los tres roles consultan; el encargado solo ve su sucursal. Solo `ENCARGADO` escribe movimientos de su propia sucursal. |
| Movimientos | Historial paginado y filtrable | Consulta únicamente | `ADMIN_CENTRAL` y `ENCARGADO`. El coordinador no ve el historial. |

Las otras seis áreas (transferencias, efectivo, planilla, activos, solicitudes y auditoría) conservan páginas de preparación: sus interfaces **todavía no están implementadas**. El backend ya dispone de ellas.

## Instalación en Windows usando PowerShell

**1.** Conserva tu backend v1.4 validado y tu Oracle XE actual. En una terminal, ejecuta:

```powershell
cd C:\ruta\SIGFAR_Backend
npm run dev
```

Comprueba `http://127.0.0.1:3000/api/v1/health`.

**2.** Extrae el ZIP de la Etapa 2 en una carpeta propia, por ejemplo `C:\proyectos\SIGFAR_Frontend_Etapa2`. No sobrescribas el archivo `.env` ni el backend, y haz copia de tu frontend anterior antes de reemplazarlo. Si ya personalizaste la Etapa 1, compara cambios antes de copiar archivos.

```powershell
cd C:\proyectos\SIGFAR_Frontend_Etapa2
npm install
npm test
npm run build
npm run dev
```

**3.** Abre `http://127.0.0.1:5173`. Inicia sesión con tus credenciales actuales de SIGFAR, sin publicar ni copiar la contraseña de Oracle en React.

Vite usa el proxy `/api → http://127.0.0.1:3000` de la Etapa 1. Si cambiaste el puerto del backend, copia `.env.example` a `.env` y ajusta `SIGFAR_API_TARGET` (solo Vite, nunca secreto del navegador).

## Reglas que respeta la interfaz

- Autenticación real con JWT del backend; no hay datos inventados ni almacenamiento de contraseñas.
- Sucursales y medicamentos: `POST` para crear; `PATCH /:id` para editar. Los listados son `GET`, con `limite` y `desde`.
- Inventarios: `GET /inventarios`, `GET /inventarios/movimientos`, `POST /inventarios/movimientos`.
- El encargado únicamente envía `id_sucursal` de su cuenta. La API vuelve a validar los permisos en cada operación.
- Inventario inicial se admite una sola vez por sucursal y medicamento; los ajustes solo cuando ya existe una fila de inventario.
- Salidas de inventario nunca permiten utilizar cantidades reservadas (regla verificada por Oracle/backend).
- Los campos `cantidad` y `tiempo_entrega_min` se envían como enteros, no como texto. Los estados se mantienen en códigos `S/N`, y los tipos de movimiento respetan el contrato v1.4.
- Las consultas paginadas muestran 20 resultados como máximo; el backend no informa el total de registros y por eso solo hay botones Anterior/Siguiente. Si una página de 20 es la última, Siguiente puede devolver una página vacía, desde la cual puedes volver con Anterior.
- Las listas de selección utilizan lotes de hasta 100 por petición, con límite de seguridad de 20 páginas. Ante un catálogo superior a 2.000 filas se informa el límite y no se inventan elementos faltantes.

## Contratos API consumidos

| Verbo | Ruta | Uso |
|---|---|---|
| GET | `/api/v1/sucursales?desde=0&limite=20&activa=S` | Listar y filtrar sucursales |
| POST | `/api/v1/sucursales` | Crear sucursal (administrador) |
| PATCH | `/api/v1/sucursales/:id` | Actualizar sucursal (administrador) |
| GET | `/api/v1/medicamentos?desde=0&limite=20&activo=S` | Listar y filtrar medicamentos |
| POST | `/api/v1/medicamentos` | Crear medicamento (administrador) |
| PATCH | `/api/v1/medicamentos/:id` | Actualizar medicamento (administrador) |
| GET | `/api/v1/inventarios?id_sucursal=1&id_medicamento=2` | Consultar existencias y reservas |
| GET | `/api/v1/inventarios/movimientos?desde=0&limite=20` | Consultar historial (administrador o encargado) |
| POST | `/api/v1/inventarios/movimientos` | Registrar inventario inicial o ajuste (encargado) |

**Datos:** cada ruta responde con `{ datos: ... }`. Los listados utilizan snake_case, igual que el backend.

## Comprobación

```powershell
npm test    # pruebas unitarias de cliente HTTP, permisos, validaciones y API
npm run build    # compilación React/Vite
```

Se añadieron **17 pruebas** en `tests/catalogos.test.js`, además de las 17 pruebas de la Etapa 1 (total 34). Las pruebas de Node no necesitan conexión a Oracle ni modifican datos. Las comprobaciones funcionales de escritura deben hacerse en un esquema QA o con registros ficticios en un entorno de demostración.

Revisa `PRUEBAS_MANUALES.md` para la validación por roles y `VALIDACION_LOCAL.md` para conocer las comprobaciones realizadas durante la preparación del paquete.

## Sin cambios al alcance

No se han añadido proveedores, compras, recetas, lotes, vencimientos, facturación, integración telefónica ni otras áreas fuera del enunciado. Los permisos y las operaciones siguen en el backend; React solo proporciona interfaz para funciones ya validadas.

# SIGFAR — Frontend React | Etapa 1

Proyecto universitario: Sistema Integral de Gestión de Farmacias.

**Esta entrega desarrolla únicamente la Etapa 1 aprobada**: proyecto React/Vite, integración HTTP con el backend validado v1.4, autenticación real, persistencia limitada a la pestaña, navegación por los tres roles y presentación visual del espacio de trabajo. Los módulos del negocio **aún no contienen formularios ni consultas operativas**; cada página indica la etapa en la que se desarrollará. No se ha cambiado la base de datos ni el backend.

## Requisitos

- Node.js **20.19+ o 22.12+** (recomendado Node 22 LTS o posterior compatible).
- npm y un navegador moderno.
- Backend SIGFAR **v1.4** ya validado, conectado a Oracle XE (`127.0.0.1:1521/XEPDB1`).
- El backend debe estar escuchando en `http://127.0.0.1:3000`.

## Instalación local (Windows / PowerShell)

**Terminal A — Backend (conserva tu versión validada):**

```powershell
cd C:\ruta\a\SIGFAR_Backend
npm run dev
```

Comprueba en el navegador: `http://127.0.0.1:3000/api/v1/health`.

**Terminal B — Este frontend (carpeta SIGFAR_Frontend_Etapa1):**

```powershell
cd C:\ruta\a\SIGFAR_Frontend_Etapa1
npm install
npm run dev
```

Abre **http://127.0.0.1:5173** en el navegador (no en el puerto del backend).

Vite recibe las llamadas del navegador a `/api/v1/*` y las reenvía al backend local `http://127.0.0.1:3000`. Esto evita configurar CORS o exponer credenciales de Oracle en React.

> Si la API utiliza otro puerto, copia `.env.example` como `.env` dentro de este frontend y cambia solamente `SIGFAR_API_TARGET`. **Nunca agregues contraseñas Oracle ni JWT_SECRET al frontend.** La variable es leída por Vite en el servidor de desarrollo; no es una variable `VITE_*` del navegador.

## Usuarios de demostración

El usuario y la contraseña están en Oracle y son verificados por la API; no se codifican en React. En la carga inicial del esquema universitario se incluyeron:

| Cuenta de prueba | Rol | Módulos visibles |
|---|---|---|
| `admin@sigfar.test` | ADMIN_CENTRAL | 9 módulos, incluida auditoría |
| `guatemala@sigfar.test` | ENCARGADO | 8 módulos, sin auditoría centralizada |
| `entregas@sigfar.test` | COORD_ENTREGAS | Sucursales, Medicamentos, Inventarios y Solicitudes |

Las cuentas de carga inicial usan `Demo2026!`, salvo que hayas cambiado sus contraseñas. Utiliza las credenciales actuales de tu Oracle. El formulario no incorpora estas credenciales automáticamente.

## Qué puedes comprobar desde el navegador

1. Inicia sesión con cada rol; el backend devuelve token y usuario. El menú cambia según el rol.
2. Recarga la página: se conserva el token **solo dentro de la pestaña actual** y se verifica otra vez con `/api/v1/auth/me` antes de mostrar el contenido.
3. Como coordinador, visita manualmente `http://127.0.0.1:5173/auditoria`: la interfaz muestra "No tienes permiso".
4. Como administrador, `/auditoria` es visible pero su pantalla operativa está claramente marcada **pendiente de interfaz — etapa 7**.
5. Cierra sesión: se limpia el token y vuelves a la pantalla de inicio de sesión.
6. Apaga temporalmente el backend y recarga una sesión previamente iniciada: se muestra un mensaje de conexión y el botón **Reintentar**; no se considera autenticada la sesión hasta que `/auth/me` responda.
7. En el resumen revisa el indicador **API HTTP operativa**. El endpoint `/health` confirma el proceso HTTP; **no valida por sí solo Oracle**. La autenticación y `/auth/me` sí usan la base de datos.

## Pruebas automatizadas incluidas

```powershell
npm test
```

Pruebas Node integradas (no tocan Oracle): coincidencia de roles, restricciones visuales, estructura del usuario, rutas del cliente HTTP, login, token Bearer, errores de credenciales, respuesta 401, respuesta 403 y salud de la API.

Tras `npm install`, comprueba la compilación:

```powershell
npm run build
```

O ambas cosas:

```powershell
npm run check
```

La carpeta `dist/` contiene el frontend compilado. Para **desarrollo** usa `npm run dev`: la vista previa del compilado por sí sola no configura un proxy de producción. Ese servidor y el HTTPS se abordarán al desplegar el sistema en la nube.

## Contrato real del backend que consume esta etapa

| Operación | Método / ruta | Respuesta relevante |
|---|---|---|
| Salud HTTP | `GET /api/v1/health` | `{ servicio: "SIGFAR", estado: "activo" }` |
| Inicio de sesión | `POST /api/v1/auth/login` | `{ token, tipo: "Bearer", usuario: { id_usuario, nombre, correo, id_sucursal, rol } }` |
| Revalidación | `GET /api/v1/auth/me` | `{ usuario: { id_usuario, nombre, correo, id_sucursal, rol } }` |

Errores de API: `{ "error": { "codigo": "...", "mensaje": "..." } }`.

Los roles corresponden exactamente a `ADMIN_CENTRAL`, `ENCARGADO` y `COORD_ENTREGAS` del backend v1.4. No se ha creado un endpoint nuevo.

## Estructura de archivos

```text
SIGFAR_Frontend_Etapa1/
  index.html
  vite.config.js
  package.json
  .env.example
  public/favicon.svg
  src/
    main.jsx
    app/App.jsx
    contexts/AuthContext.jsx
    services/{http,authApi,healthApi,sessionStore}.js
    utils/access.js
    components/{Icon,Brand,LoadingScreen,RequireAuth}.jsx
    layouts/AppLayout.jsx
    pages/{LoginPage,HomePage,ModulePage,UnauthorizedPage,NotFoundPage}.jsx
    styles/global.css
  tests/{access,http}.test.js
  LEEME.md
  PRUEBAS_MANUALES.md
```

## Qué NO hace esta etapa

- No modifica ni ejecuta SQL sobre Oracle XE.
- No cambia rutas, permisos o transacciones del backend v1.4.
- No crea, modifica, transfiere o reserva medicamentos desde React todavía.
- No genera ni muestra cifras empresariales ficticias como si fueran consultas reales.
- No crea portales públicos de clientes ni telefonía.
- No incluye despliegue cloud, que es la etapa 8 del plan aprobado.

## Solución de problemas

- **Pantalla “Sin conexión”**: revisa que el backend esté activo en puerto 3000. Abre `/api/v1/health` directamente en 3000 y verifica los errores de la terminal de Vite.
- **401 credenciales incorrectas**: usa la cuenta actual en Oracle; no es una contraseña del frontend.
- **429 DEMASIADOS_INTENTOS**: el backend limita 10 intentos por 15 minutos; evita repetir contraseñas incorrectas.
- **Puerto 5173 ocupado**: cierra otro Vite; se usa `strictPort` para evitar abrir una instancia inesperada.
- **Acceso a un módulo no autorizado**: es comportamiento correcto. Los permisos se hacen cumplir realmente en el backend; los menús de React son solo una ayuda visual.
- **Problemas con “localhost”**: utiliza `http://127.0.0.1:5173` como URL de la aplicación.

## Nota de seguridad

El JWT permanece en `sessionStorage`, que lo limita a la pestaña/sesión del navegador, pero **no es un sustituto de medidas de protección contra XSS**. No instales extensiones desconocidas ni publiques credenciales de prueba en un entorno real. Este prototipo sigue siendo de uso académico.

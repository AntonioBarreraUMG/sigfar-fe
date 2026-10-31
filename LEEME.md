# SIGFAR — Frontend React + Vite · Etapa 3: Transferencias

Prototipo académico de la Universidad Mariano Gálvez de Guatemala. Entrega **acumulativa** respecto a la Etapa 2: mantiene la autenticación, los permisos, las pantallas de sucursales, medicamentos e inventarios y añade las transferencias completas por interfaz web.

**Compatibilidad:** backend SIGFAR v1.4 (Node.js + Express) y el esquema Oracle XE ya validado (`127.0.0.1:1521/XEPDB1`). **No hay scripts SQL nuevos ni modificaciones al backend.**

## Funcionalidades de la etapa

- `GET /api/v1/transferencias`: historial con paginación de 20 en 20, filtros por estado y por sucursal (solo administrador).
- `GET /api/v1/transferencias/:id`: detalle de encabezado y medicamentos.
- `POST /api/v1/transferencias`: registrar transferencia de uno a 50 medicamentos, sin descuento inmediato de inventario.
- `POST /api/v1/transferencias/:id/despachar`: cambiar de `REGISTRADA` a `EN_TRANSITO`; el backend comprueba existencias disponibles y descuenta el inventario de origen.
- `POST /api/v1/transferencias/:id/recibir`: cambiar de `EN_TRANSITO` a `RECIBIDA`; el backend incrementa inventario de destino.

Los dos endpoints de cambio de estado reciben **POST sin cuerpo JSON**. Cada acción muestra un aviso de confirmación antes del envío. Se impide utilizar la interfaz mientras una escritura está en progreso y se exponen los errores devueltos por la API. El backend sigue aplicando permisos y transacciones.

## Permisos

| Rol | Consultar | Registrar | Despachar | Recibir |
|---|---|---|---|---|
| `ADMIN_CENTRAL` | Todas | No | No | No |
| `ENCARGADO` | Donde participa su sucursal | Desde su sucursal | Si es el origen | Si es el destino |
| `COORD_ENTREGAS` | No | No | No | No |

## Una limitación del backend que el frontend respeta

`GET /api/v1/sucursales` devuelve **solo la propia sucursal** para el rol `ENCARGADO`. Sin embargo, este mismo rol puede transferir medicamentos a otras farmacias utilizando `id_sucursal_destino`. No hay un endpoint de búsqueda pública de sucursales que podamos consumir sin cambiar el backend.

Por eso el formulario pide el **ID numérico de la sucursal destino**. El administrador puede consultar ese ID desde la pantalla *Sucursales* y facilitárselo al encargado. El backend verifica que la sucursal destino exista, esté activa y sea diferente del origen. El registro no deja de funcionar por no disponer del nombre del destino en el selector.

Esta elección es deliberada: **no se cambiaron permisos del backend, ni se agregó un endpoint, ni se amplió el alcance académico**.

## Ejecutar en Windows / PowerShell

1. Deja en funcionamiento tu backend v1.4 y la base de datos Oracle XE habitual.

   ```powershell
   cd C:\ruta\SIGFAR_Backend
   npm run dev
   ```

2. Extrae este paquete en una carpeta nueva. Es una copia completa del frontend, no necesitas aplicar parches manuales. Conserva una copia de tu Etapa 2 funcionando.

   ```powershell
   cd C:\ruta\SIGFAR_Frontend_Etapa3
   npm install
   npm test
   npm run build
   npm run dev
   ```

3. Abre **http://127.0.0.1:5173**. El proxy de Vite envía `/api` a `http://127.0.0.1:3000`. No es necesario exponer Oracle a React. Si tu backend usa un puerto distinto, crea un `.env` del frontend basado en `.env.example` y cambia `SIGFAR_API_TARGET`; nunca copies contraseñas de Oracle ni el secreto JWT al frontend.

4. Inicia sesión con un encargado y entra a **Transferencias**. Para confirmar una transferencia completa entre sucursales necesitas iniciar sesión como encargado de origen y después como encargado del destino.

5. Sigue `PRUEBAS_MANUALES.md` antes de dar la etapa por validada.

## Comprobaciones automatizadas

```powershell
npm test
npm run build
```

Se incluyen **54 pruebas Node** (34 previas + 20 nuevas). Las nuevas verifican rutas REST, filtros, permisos, transiciones de estado, datos numéricos, renglones duplicados y tratamiento de respuestas 403/409. Estas pruebas **no modifican Oracle**.

Las pruebas completas desde el navegador dependen del backend y Oracle locales; los procedimientos están en `PRUEBAS_MANUALES.md`. Realiza las pruebas de escritura en el esquema de demostración o QA, para evitar alterar registros que desees conservar.

## Alcance que se conserva

Quedan pendientes las pantallas de efectivo, planillas, activos fijos, solicitudes/entregas y auditoría. El backend de estos módulos sigue disponible, pero las páginas React aún muestran que están pendientes. No se han incluido compras, facturación, órdenes públicas, geolocalización, notificaciones ni gestión de proveedores.

# SIGFAR — Frontend React + Vite — Etapa 4

## Alcance

Proyecto **completo y acumulativo** sobre la Etapa 3 comprobada por el usuario. Se añaden tres pantallas: **Efectivo**, **Planillas** y **Activos fijos**. Conserva autenticación, sucursales, medicamentos, inventarios y transferencias.

**No cambia** el backend Node.js + Express v1.4, la base de datos Oracle XE (XEPDB1), ni los permisos o contratos de API. No se requiere ejecutar SQL ni recargar datos iniciales.

## Requisitos

- Node.js >= 20.19
- npm
- Backend SIGFAR v1.4 funcionando con Oracle XE en `127.0.0.1:1521/XEPDB1`
- API disponible en `http://127.0.0.1:3000/api/v1/health`
- Usuario administrador o encargado de sucursal. El coordinador no tiene acceso a estos módulos.

## Instalación (Windows PowerShell)

1. Detén la instancia anterior de React y haz una copia de seguridad de la carpeta Etapa 3.
2. Descomprime este ZIP como proyecto **completo** en una carpeta nueva; no es un parche parcial.
3. Mantén el backend v1.4 iniciado y su `.env` actual.
4. Abre PowerShell en la carpeta del frontend y ejecuta:

```powershell
npm install
npm test
npm run build
npm run dev
```

5. Abre `http://127.0.0.1:5173/` en tu navegador.

Si el backend funciona en otro puerto, copia `.env.example` a `.env` y cambia `SIGFAR_API_TARGET`. **Nunca** coloques secretos JWT ni credenciales Oracle en el frontend.

## Funcionalidades

### Efectivo `/efectivo`

- Consulta paginada de ingresos y egresos, filtros por sucursal (administrador), tipo y fechas.
- Resumen calculado por API: ingresos, egresos, flujo neto y cantidad de movimientos, con desglose por sucursal.
- Registro de movimiento únicamente por encargado en su farmacia.
- Detalle de lectura del movimiento; no se implementa edición ni eliminación de efectivo.

### Planillas `/planillas`

- Consulta paginada y resumen de gastos por período y sucursal.
- Filtros por sucursal (administrador) y período de inicio/fin.
- Encargado registra un único monto por período de su sucursal (el servidor rechaza duplicados).
- Encargado puede corregir exclusivamente el **monto** de su registro; la auditoría registra el cambio.
- Sin cálculo de salarios individuales ni nómina completa.

### Activos fijos `/activos`

- Consulta paginada con filtros por sucursal y estado.
- Resumen de cantidad y valor de activos **vigentes**, independientemente del filtro de estado del listado.
- Encargado registra activos propios y puede modificar descripción, valor o estado (`VIGENTE`/`BAJA`).
- Sin depreciación ni contabilidad general.

## Seguridad y datos

- El administrador **solo consulta** estos módulos; no registra ni modifica.
- El encargado **solo opera sobre su sucursal**. La comprobación en React complementa, pero no sustituye, la del backend.
- El coordinador no puede abrir estas rutas ni verlas en el menú.
- Los montos se envían a la API como **cadenas decimales** (`"150.25"`) para evitar redondeos IEEE 754.
- La moneda visualizada es GTQ; las fechas siguen el huso `America/Guatemala`.
- Los registros de planilla y activos corregidos conservan su historial de auditoría en Oracle.
- La paginación usa `limite=20` y `desde`; la API no expone un conteo total, por lo que no se infieren páginas totales.

## Pruebas

```powershell
npm test       # 81 pruebas de lógica y contratos de API
npm run build  # Compilación completa con Vite y React
```

Revisa `PRUEBAS_MANUALES.md` para comprobar los tres roles, los formularios y la persistencia real en Oracle. Emplea el esquema de QA o datos ficticios para operaciones de escritura.

## Notas de validación de esta entrega

En el entorno de generación se ejecutaron **81 de 81 pruebas JavaScript**; se verificaron también 34 archivos JS/JSX y 112 importaciones locales mediante el analizador TypeScript. **No fue posible ejecutar `npm install` ni `npm run build` aquí** por falta de resolución de `registry.npmjs.org`. La compilación y las pruebas reales en navegador contra el backend local quedan a cargo del usuario.

## Siguiente etapa

Etapa 5: Solicitudes y entregas, usando exclusivamente los endpoints existentes del backend v1.4.

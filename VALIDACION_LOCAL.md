# Validación realizada en el entorno de preparación

**Alcance de los resultados:** pruebas de código sin conexión a tu Oracle local.

- `npm test`: 17 pruebas automatizadas aprobadas.
- Análisis sintáctico de JavaScript y JSX con el parser de TypeScript instalado en el entorno: sin errores.
- Resolución de referencias locales de importación: sin rutas faltantes.
- Análisis sintáctico de `src/styles/global.css` con PostCSS: correcto.
- Contrato de autenticación cotejado con el código del backend SIGFAR v1.4 real (`auth/login`, `auth/me`, estructura `usuario`, roles y error JSON).
- ZIP del proyecto: integridad verificada después de empaquetar.

**No se ha ejecutado aquí:** `npm install`, `npm run build`, pruebas visuales del navegador ni llamadas al backend de tu computadora. Estas pruebas requieren las dependencias npm y tu instancia local de Node/Oracle. Las instrucciones y los casos manuales están en `LEEME.md` y `PRUEBAS_MANUALES.md`.

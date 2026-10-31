# Validación del código en el entorno de generación

- Versión: frontend SIGFAR `0.4.0`.
- Fuente: copia integral de la Etapa 3 y los nuevos componentes de Efectivo, Planillas y Activos Fijos.
- Contratos revisados directamente en el código backend SIGFAR v1.4: `/efectivo`, `/planillas`, `/activos`.
- `npm test`: **81 aprobadas / 81 ejecutadas** (54 previas y 27 nuevas).
- Análisis de sintaxis JS/JSX: **34 archivos**, sin errores detectados.
- Importaciones relativas JS/JSX analizadas: **112**, sin referencias faltantes.
- `npm install --offline`: falla porque no hay paquetes React/Vite en caché.
- `npm install` con registro en línea: falla con `EAI_AGAIN`, resolución DNS de `registry.npmjs.org`.
- `npm run build`: **no ejecutado aquí** porque las dependencias no se pudieron instalar.
- Navegador integrado con backend del usuario: **no ejecutado**, pues la API Oracle está en la computadora del usuario.

Ejecutar `npm install`, `npm test`, `npm run build`, `npm run dev` y las comprobaciones de `PRUEBAS_MANUALES.md` en la computadora donde funciona Node.js + Oracle XE.

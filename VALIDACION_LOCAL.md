# SIGFAR — Evidencia de comprobación · Frontend Etapa 3

- Pruebas unitarias de Node: **54 aprobadas**, 0 fallidas (`npm test`). Incluye 20 casos nuevos.
- Análisis sintáctico de archivos JS/JSX mediante parser TypeScript: **32 archivos** con sintaxis correcta.
- Referencias a módulos locales: comprobación de existencia realizada.
- Backend: **no modificado**. Oracle XE: **no modificado**.

**Limitaciones del entorno de construcción:** no se pudo descargar `react`, `vite` ni otros paquetes npm debido a que la resolución de `registry.npmjs.org` falló (`EAI_AGAIN`). Por lo tanto, aquí **no se ejecutó `npm run build`, ni se inició Vite ni se verificaron flujos HTTP reales contra Oracle local**. El usuario debe comprobar la compilación, el navegador y las operaciones contra su backend validado, siguiendo `PRUEBAS_MANUALES.md`.

**Nota sobre el ID destino:** el API limita `GET /sucursales` al propio registro para el encargado. El formulario acepta la entrada manual del identificador de la sucursal destino y deja al servidor validar su existencia/actividad. No se modificaron los permisos.

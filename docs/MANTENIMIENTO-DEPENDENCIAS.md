# Mantenimiento de dependencias y carga inicial

10 de noviembre de 2026. Misma demo local, datos ficticios, rutas y perfiles simulados.

## Dependencias

La auditoría inicial reportaba 16 avisos moderados derivados de `glob` y `minimatch` en el árbol de herramientas de Angular CLI. Se conserva el reporte original en `dependency-audit-before.json`; `dependency-audit.json` contiene la revisión posterior.

Se mantuvieron Angular 21 y sus componentes. `package.json` fija mediante `overrides`, exclusivamente dentro del árbol de `@angular/cli`, `glob@14.0.4` y `minimatch@11.0.6`; `package-lock.json` registra la resolución. No se desactivó la auditoría ni se ejecutó `npm audit fix --force` (la propuesta inicial degradaba la CLI a 16).

Los avisos oficiales describen las correcciones en [glob 14.0.2](https://github.com/isaacs/node-glob/security/advisories/GHSA-3g3m-2fjr-6pw4) y [minimatch 11.0.1](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249). La sintaxis del ajuste se basa en los [overrides de npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides).

Estos overrides cruzan versiones mayores de dependencias transitivas. Son un ajuste temporal: al actualizar la CLI se debe comprobar si su árbol ya incluye versiones corregidas, retirar el override correspondiente y repetir instalación, auditoría y pruebas. No se presume compatibilidad de todos los comandos posibles de la CLI. El entorno validado es Node 24.14.1 y npm 11.11.0.

`npm run test:dependencies` comprueba cuatro usos reales del árbol instalado, con archivos ficticios en `tmp/dependency-checks`, sin acceso a servicios externos:

1. Normalización de paquetes y descubrimiento de ejecutables con `@npmcli/package-json`/`glob`.
2. Empaquetado y extracción mediante `pacote`, respetando exclusiones `.npmignore` y `minimatch`.
3. Verificación y limpieza de una caché aislada mediante `cacache`/`glob`.
4. Coincidencia de rutas delegadas TUF, incluyendo rutas admitidas y rechazadas. No es una prueba criptográfica ni contacta registros externos.

## Carga inicial

Se conserva el presupuesto Angular de 500 kB para aviso y 1 MB para error. No se excluyeron archivos del cómputo ni se desactivaron advertencias.

- `MatPaginatorIntl` y sus etiquetas en español pasan del proveedor raíz al listado de estudiantes, que ya pertenece a una ruta diferida.
- El selector de perfil sigue siendo `MatSelect`, con las mismas tres opciones. Su componente se carga con `@defer (on idle)` después del renderizado inicial. Mientras carga, se reserva el espacio con el nombre del perfil y un control deshabilitado; al estar disponible conserva la interacción Material y por teclado.
- Se importan las directivas de botones utilizadas y el paginador standalone.
- Inter conserva los mismos pesos 400/500/600/700 y se sirve localmente con el subconjunto latino, que incluye acentos y ñ usados en español.

La medida **initial** corresponde al arranque de Angular; los chunks de rutas, filtros, selector y listados se descargan cuando corresponda. Esta división no equivale a eliminar todo ese código ni a una medición de rendimiento de extremo a extremo.

Los resultados finales y los límites de la verificación se registran en [VERIFICACION.md](VERIFICACION.md).

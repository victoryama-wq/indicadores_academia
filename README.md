# Indicadores de Academia · Tec Playa

Aplicación de Tec Playa para consultar entregas y calificaciones por grupo, asignatura y docente. La vista privada de Coordinación está publicada en Firebase y utiliza datos simulados. Sistemas accede con su cuenta institucional de Google. La demo local incluye además el selector de perfiles y la administración de insumos. [Abrir la vista privada](https://indicadores-academia.web.app/reportes)

## Cómo retomar el proyecto

1. Lee el [estado actual](docs/ESTADO-ACTUAL.md) para identificar la última implementación, la publicación confirmada y la siguiente acción.
2. Sigue el [protocolo de Codex](AGENTS.md) para comprobar la rama, los cambios locales y los PR antes de editar.
3. Para investigar un cambio, abre el PR y la ejecución de CI enlazados en el estado. Para publicar o recuperar la vista, consulta la [guía de Firebase](docs/VISTA-FIREBASE.md).

## Ejecutar en Windows / PowerShell

Validado con Node.js 24.14.1 y npm 11.11.0. Se recomienda Node 24 LTS. No es necesario instalar Angular CLI globalmente para ejecutar el proyecto.

```powershell
cd C:\Users\Admin\Documents\Indicadores_Academia\indicadores-academia-demo
npm ci
npm start
```

Abrir http://127.0.0.1:4300/inicio. El servidor escucha solo en loopback y revisa cambios cada segundo para facilitar la recarga en Windows. Para detenerlo, Ctrl+C.

```powershell
npm run build
npm test
npm run test:dependencies
npm run test:e2e
```

Las pruebas E2E utilizan Microsoft Edge instalado (`channel: msedge`) y arrancan el servidor cuando es necesario. `npx playwright show-report` abre el reporte local. La compilación se genera en `dist/indicadores-academia-demo/browser`. La compilación privada se genera con `npm run build:vista` en `preview/functions/app/browser` y la sirve `vistaAcademia` después de comprobar la sesión.

## Integración continua

GitHub Actions ejecuta dos trabajos en los PR dirigidos a `main` y en los cambios integrados a esa rama. Los comandos, versiones de Node y disparadores se mantienen en el [workflow de CI](.github/workflows/ci.yml).

- **Validación Angular** compila la demo y la vista privada, ejecuta las pruebas unitarias, comprueba las dependencias y prueba el lector Moodle y el acceso a la vista con datos e identidades ficticios.
- **E2E Edge** recorre la demo, el piloto local y la vista privada en navegador. Incluye la navegación por grupos y docentes y el regreso al destino tras el ingreso. El reporte y los resultados de Playwright se conservan como artefactos durante siete días.

La comprobación obligatoria de la rama es **Validación Angular**. Las publicaciones confirmadas y sus pruebas en el dominio se registran en el [estado actual](docs/ESTADO-ACTUAL.md).

## Recorrido

| Ruta                                | Resultado                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `/inicio`                           | Periodo, corte, filtros, indicadores y acceso al grupo                         |
| `/grupos`                           | Grupos y asignaturas de la selección                                                         |
| `/grupos/g01`                       | ENF-301, asignatura y docente                                                  |
| `/asignaturas/i01`                  | Enfermería Clínica, clave visible ENF-304, actividad                           |
| `/actividades/a01`                  | Plan de cuidados, resumen y registros                                          |
| `/actividades/a01?estado=pendiente` | Exactamente 6 pendientes: 4 vencidos y 2 en plazo                              |
| `/docentes`                         | Listado docente con búsqueda, filtros y entregas por responsable               |
| `/docentes/d01`                     | Docente A: dos grupos y dos imparticiones, con desglose por actividad          |
| `/seguimiento/r019`                 | Ficha individual de un pendiente vencido                                       |
| `/seguimiento/r023`                 | Ficha individual de un pendiente en plazo                                      |
| `/seguimiento/r001`                 | Registro calificado con cero; no se trata como dato vacío                      |
| `/reportes`                         | Tres consultas por ciclo, conteos de personas/entregas, pesos y calendario     |
| `/admin/insumos`                    | Demo local de Sistemas: cargas ficticias con vista previa, validación y activación por ciclo |

Desde Inicio: **Ver grupos y asignaturas → Abrir asignatura → Abrir actividad → 6 pendientes de calificar → Ver ficha**. La selección de una cifra limpia la búsqueda de estudiantes para que el detalle explique exactamente esa cifra. La búsqueda de estudiantes se conserva por actividad, sin afectar las consultas de otros docentes. La búsqueda, el orden y la página se recuperan al volver de la ficha.

Los parámetros `periodo`, `corte`, `carrera`, `modalidad`, `grupo`, `asignatura`, `docente`, `tipo`, `unidad`, `estado`, `pagina`, `tamano`, `orden` y `origenDocente` conservan el contexto. Solo contienen identificadores de catálogos o valores de estado. El texto de búsqueda y el perfil se guardan en `sessionStorage`, nunca en la dirección. La recarga de un enlace no depende de `history.state`.

## Conjunto de demostración

Recorrido original conservado: ENF-301 → Licenciatura en Enfermería → Escolarizada → Enfermería Clínica → Plan de cuidados. Periodo de demostración 27-1, corte 6 de noviembre de 2026 a las 23:59, zona America/Cancun.

- 30 estudiantes distintos y 30 registros estudiante-actividad.
- 24 entregas recibidas = 18 calificadas + 6 pendientes.
- Los 6 pendientes = 4 vencidos + 2 en plazo.
- 6 registros sin entrega.
- Estados y fechas precargados, sin reglas institucionales ni cálculo de vencimientos por reloj actual.

Las proporciones 24/30 y 18/24 describen únicamente el conjunto ficticio; las fórmulas oficiales, plazos, prórrogas, reentregas y cortes quedan pendientes de Academia. Todos los nombres y matrículas son explícitamente ficticios.

La consulta docente amplía el catálogo a tres docentes, tres grupos y cuatro imparticiones (cinco actividades): Enfermería en modalidad Escolarizada y Administración en modalidad Mixta. El docente A atiende dos asignaturas; el C no tiene pendientes. En todo el conjunto hay **36 personas únicas y 42 pares estudiante–actividad**, con **25 entregas calificadas, 11 pendientes (7 vencidas y 4 en plazo) y 6 sin entrega**. No se suman los estudiantes únicos de cada docente para obtener la población global: hay personas compartidas.

Abrir **/docentes** sin parámetros consulta todo el ámbito ficticio. Al entrar desde el menú se conservan los filtros actuales; **Ver todo el ámbito demo** los restablece para mostrar los tres docentes. La búsqueda de docentes se conserva en esta pestaña, también al recargar y regresar desde el detalle. Los agregados de varias actividades se presentan como resúmenes; el desglose permite abrir cada actividad y sus pendientes usando sus identificadores reales. Los indicadores de una sola actividad mantienen sus enlaces al detalle de registros.

Contrato de conteo, supuestos de Academia, pruebas y recorrido de revisión: [Seguimiento docente demo](docs/SEGUIMIENTO-DOCENTE-DEMO.md).

### Reportes e insumos por ciclo

El tablero se titula **Seguimiento a plataforma Moodle**. En **Reportes**, consultar estudiantes únicos con tarea calificada, entregas calificadas frente a pendientes y docentes con pendientes. Los filtros incluyen ciclo, carrera, modalidad, grupo, impartición, unidad, tipo y entregas extemporáneas. Ponderación por curso y avance de calificación se muestran por separado. El propedéutico conserva el estado **Calendario pendiente** y las reglas ausentes aparecen como **Sin criterio configurado**.

Reportes reúne 62 estudiantes ficticios y 78 pares estudiante–actividad en 27-1. Hay 49 entregas calificadas, 19 pendientes de calificar y 10 sin entrega. En **Seguimiento de tareas**, Contabilidad aplicada (ADM-102) permite abrir las dos pendientes y las cuatro filas sin entrega de Balance inicial. ENF-301 conserva sus seis pendientes. El ciclo 27-2 comienza sin insumos. Sistemas puede descargar plantillas JSON, seleccionar archivos, revisar filas, validar y activar cada tipo/ciclo por separado. La simulación se conserva en la pestaña; una carga inválida mantiene la versión anterior. Solo calendario permite consultar fechas sin inventar totales. El piloto 27-1 permite cargar localmente el padrón de Saeko y el catálogo de asignaciones SPAI. Reportes distingue cobertura confirmada de entregas no calculables. No se envían datos a servicios externos. Ver [contrato, muestras ficticias y recorrido del cruce](docs/CRUCE-SAEKO-SPAI-27-1.md).

Contrato JSON, muestras, reglas propuestas por validar con Academia, límites del perfil simulado y recorrido: [Reportes e insumos demo](docs/REPORTES-INSUMOS-DEMO.md). Las pruebas unitarias y E2E cubren conteos, filtros, ciclos, activación válida/inválida, recarga, perfiles, teclado y móvil, incluidos los instantes límite de entrega y corte. La suite utiliza el workflow existente: la validación local en Windows se distingue de los jobs ejecutados en Ubuntu al abrir el PR. Publicar la rama no despliega la demo.

## Perfiles y estados de prueba de la demo local

El selector superior cambia entre Coordinación, Dirección y Sistemas. Coordinación consulta y abre una vista previa de exportación sin descarga. Dirección recorre las mismas consultas sin exportación (D08 pendiente). Sistemas añade un menú administrativo separado: **Insumos por ciclo** es funcional con archivos ficticios; las demás pantallas siguen como Próximamente. Acceder directamente a `/admin/insumos` o `/admin/catalogos` desde otros perfiles muestra Acceso restringido. Estas restricciones de demostración no son seguridad de servidor ni autenticación real.

En Inicio, Grupos o Docentes, expandir **Filtros de consulta**:

- Modalidad Mixta con el grupo ENF-301, tipo Foro, Unidad 2 o periodo 27-2: lista vacía coherente. Mixta sí tiene datos al seleccionar Administración y ADM-201.
- Corte 30 oct 2026: información incompleta, sin convertirla en cero o incumplimiento.
- Corte Simular error de consulta: error con reintento y regreso al corte de demostración.
- Carga: el adaptador emite con una breve demora y muestra progreso.
- Identificador inexistente: Recurso no disponible. Dirección desconocida: Página no encontrada.

## Estructura y contrato

Piloto local **Calendario operativo 27-2**: Sistemas → Insumos por ciclo permite leer el XLSX
de dos pestañas y cuatro bloques, revisar incidencias por pestaña/fila y activar la programación.
Reportes conserva fechas por ciclo y los avisos de fuentes/vinculación pendientes; no inventa
cursos a partir de un calendario general. Una carga inválida conserva la versión vigente.
Ver [contrato, ejemplos y recorrido](docs/IMPORTACION-CALENDARIO-27-2.md).

- `src/app/core/models.ts`: entidades, contexto de consulta, estados e interfaz `AcademicDataSource` inyectada mediante `ACADEMIC_DATA`.
- `src/app/core/demo-data.ts`: origen académico de estudiantes y registros ficticios de los recorridos originales. No importa SDK de Firebase ni usa API de Moodle.
- `src/app/core/reporting/`: contrato y validación de archivos ficticios, versiones por ciclo, fixtures adicionales y selectores de Reportes.
- `src/app/core/query-store.ts`: consulta reactiva, cancelación al cambiar de contexto, carga y errores.
- `src/app/core/navigation-context.ts`: URL, contexto, perfil y búsqueda local.
- `src/app/features/`: Inicio, grupos, asignaturas, actividades, seguimiento, docentes, reportes, insumos y estados; componentes standalone con rutas de carga diferida.
- `src/app/shared/`: filtros Material, indicadores, tabla/paginación/orden, diálogo de vista previa.
- `src/styles.scss`: tema institucional común y adaptación responsiva; `src/tailwind.css`: Tailwind 4. Inter y recursos se sirven localmente.

La futura integración de datos académicos requiere un adaptador que valide el ámbito en el servidor. La ampliación local usa supuestos explícitos, no reglas institucionales definitivas. El catálogo y los registros del adaptador remoto deberán venir autorizados por ámbito; los filtros de cliente no son controles de seguridad. La demo filtra y pagina en memoria sus 42 registros ficticios.

## Referencias, verificación y siguientes etapas

La correspondencia de todos los diseños Stitch, sus discrepancias y los criterios de las vistas faltantes se documentan en [docs/REFERENCIAS.md](docs/REFERENCIAS.md). Las verificaciones históricas de la demo local están en [docs/VERIFICACION.md](docs/VERIFICACION.md); las capturas, en `docs/evidencia/`.

Los ajustes de dependencias transitivas, sus pruebas de compatibilidad y la reducción de carga inicial se explican en [docs/MANTENIMIENTO-DEPENDENCIAS.md](docs/MANTENIMIENTO-DEPENDENCIAS.md). Mantener los overrides bajo revisión al actualizar Angular CLI.

El refactor visual, las skills locales aplicadas y la instalación de `angular/skills` se documentan en [docs/REFACTOR-UI-SKILLS.md](docs/REFACTOR-UI-SKILLS.md). Incluye mejoras de accesibilidad, tablas móviles, iconografía local y evidencia de que los contratos y dependencias de la demo permanecen intactos.

Quedan por desarrollar los reportes institucionales definitivos y su descarga, los históricos, la calidad de información y la integración de datos reales por ámbito. La revisión funcional de las vistas con Academia se sigue en el [estado actual](docs/ESTADO-ACTUAL.md).

## Piloto local de lectura Moodle

Sistemas activa las imparticiones de SPAI desde Insumos por ciclo, revisa las coincidencias con el catálogo Moodle y abre una asignatura vinculada para consultar sus tareas e indicadores. La [guía de arranque y verificación](docs/MOODLE-LECTURA-PILOTO.md) incluye las instrucciones para PowerShell y el alcance de la población.

La [guía de la vista de Coordinación para Sistemas](docs/VISTA-FIREBASE.md) describe las pruebas locales, la publicación en `indicadores-academia.web.app` y la restauración de una versión anterior.

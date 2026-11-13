# Reportes e insumos por ciclo — demostración local

## Alcance y navegación

La etapa `feat/reportes-demo` se integró con el PR #5 en `7054f19e2a94a557a9176c5d12b21fd4e167816a`; el PR #4 fue cerrado como sustituido. La ampliación local del lector XLSX se documenta en [IMPORTACION-CALENDARIO-27-2.md](IMPORTACION-CALENDARIO-27-2.md). Los resultados históricos de esta página corresponden a la etapa de Reportes.

- `/inicio`: título **Seguimiento a plataforma Moodle**; conserva el recorrido original.
- `/reportes`: tres consultas, filtros por ciclo, carrera, modalidad, grupo, docente, impartición, unidad, tipo y entrega extemporánea. La consulta y los filtros se conservan en la URL, también al recargar.
- `/admin/insumos`: selección, vista previa, validación y activación simulada de cuatro insumos por ciclo. Solo el perfil simulado **Sistemas** permite abrir la ruta y activar; cambiar a otro perfil abandona Administración.

Se reutilizan `ACADEMIC_DATA`/`AcademicDataSource`, el contexto reactivo de `QueryStore`, `NavigationContext`, filtros Material y estilos institucionales. `CycleInputStore` obtiene el conjunto original del adaptador académico y agrega fixtures exclusivos de Reportes; no modifica el conjunto que alimenta Inicio y Docentes. Los selectores de reporte son funciones puras. Las rutas nuevas se cargan de forma diferida.

La activación reemplaza **una versión vigente por tipo y ciclo**. Reemplaza el archivo completo, no acumula filas; el número de versión aumenta. Una selección o validación no activa datos. Archivo inválido o fallo de almacenamiento: la versión anterior sigue disponible. Las versiones se guardan en `sessionStorage` de la pestaña y sobreviven a la recarga; no son un historial auditable ni almacenamiento institucional. Cerrar la sesión de la pestaña devuelve los datos precargados. No hay servidor, autenticación real ni escritura a Moodle, SPAI o Firebase. Los perfiles no son controles de seguridad para datos reales.

## Unidades de conteo y cobertura

| Indicador                        | Unidad y regla de demostración                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estudiantes únicos               | `estudianteId` distintos dentro del contexto; no suma los subtotales por curso/docente.                                                             |
| Estudiantes con tarea calificada | Personas distintas con al menos una **tarea** calificada; el número de tareas se muestra aparte. Integradora, foro y examen no se asimilan a tarea. |
| Pares esperados                  | Inscripción por curso × actividades del curso; identidad `(ciclo, cursoId, actividadId, estudianteId)`.                                             |
| Entregas calificadas             | Pares con entrega y calificación al corte. **0 es calificación**, no ausencia.                                                                      |
| Entregas pendientes              | Pares con entrega recibida al corte y sin calificación al corte. No equivale a estudiantes únicos ni a falta de entrega.                            |
| Sin entrega                      | Fila explícita del libro con `entregaEn: null`, o entrega posterior al corte.                                                                       |
| Sin evidencia                    | Inscripción/actividad sin fila correspondiente en el libro; no se interpreta como falta de entrega.                                                 |
| Avance de calificación           | Calificadas / (calificadas + pendientes) × 100, redondeado. Sin denominador: No aplica. No usa ponderaciones.                                       |
| Ponderación configurada          | Cuatro pesos por curso, independientes del avance; no se calcula nota final.                                                                        |
| Docentes con pendientes          | Identidades docentes con al menos una entrega pendiente en la selección; sus cifras incluyen exclusivamente registros filtrados.                    |

Todo cruce exige el mismo ciclo. Los identificadores deben ser estables y únicos dentro de ese ciclo. Un curso representa una impartición (asignatura + grupo + docente). Los registros sin correspondencia se muestran con origen y fila, se excluyen del cruce y dejan la cobertura como parcial. No se concilian automáticamente identidades por nombre. Las bajas son por inscripción/curso y se aplican si `fechaBaja <= corte de consulta`; la cifra de excluidos cuenta pares, no personas. Sin archivo de bajas, se advierte población provisional.

El calendario solo permite revisar fechas, actividades y pesos. Hasta contar con calendario + SPAI + libro, los totales se presentan como **no calculables**, no como cero. Con archivos presentes pero filas de libro ausentes, se muestra **cobertura parcial**. Un filtro sin coincidencias muestra vacío. Existen estados de carga, error y corte incompleto; nunca se recuperan datos de otro ciclo para llenar una selección vacía.

### Conjuntos reproducibles

- `p01` (27-1, ciclo en operación de la demo): fecha de consulta fija **2026-11-06 23:59 -05:00**. Reportes: **38 estudiantes únicos, 54 pares, 31 calificadas, 17 pendientes y 6 sin entrega**. Consulta de tarea calificada: **24 personas**. Dos estudiantes se comparten entre tres cursos de Ejecutiva, Virtual y Posgrados; el docente D tiene 6 calificadas y 6 pendientes.
- Los cursos originales no cambian: Docentes mantiene 36 personas/42 pares; ENF-301 conserva 30 personas, 18 calificadas y **6 pendientes: 4 vencidos y 2 en plazo**. Las entregas extemporáneas de Reportes son un concepto distinto de los pendientes de calificación vencidos del recorrido original.
- `p02` (27-2, preparación): sin insumos iniciales; fecha de consulta fija **2027-03-06 23:59 -05:00**. Las cuatro plantillas contienen un curso y una persona. Calendario + SPAI + libro producen una entrega calificada con **cero**. Activar además la baja de ejemplo excluye ese par y deja cero resultados.
- El reloj actual solo etiqueta el momento de activación, nunca determina los conteos.

## Fechas, modalidades y decisiones de Academia

Ejecutiva, Virtual y Posgrados usan apertura y fecha de corte como cierre. Escolarizada mantiene fecha de entrega y fecha de corte distintas: entrega posterior a la fecha de entrega es extemporánea, incluso si antecede al corte. La igualdad con el cierre se considera en tiempo. `recordarmeCalificar` es interno; no vence entregas, no atribuye incumplimiento docente y no envía mensajes.

Sin apertura, sin corte, sin fecha de entrega en Escolarizada, entrega anterior a apertura, modalidad Mixta sin equivalencia aprobada o actividad propedéutica: **Sin criterio configurado** para la clasificación de entrega. Se admiten fechas `null` para hacer visible esa falta de criterio. El propedéutico figura expresamente como **Calendario pendiente**; no se inventa su calendario.

Se contrastó el documento externo `Requerimientos_Indicadores_Academia_v0_5.docx` disponible junto al proyecto. Las instrucciones actuales precisan las modalidades, pero **Academia aún debe validar**:

- D02 / ámbito y población: inscripción por impartición, grupos compartidos, responsabilidad docente, equivalencias y vigencia de movimientos de baja; esta demo no asigna ámbitos reales a los perfiles.
- D05 / calendarios: intervalos de ciclos, fecha de corte de consulta frente al cierre de cada actividad, horarios, prórrogas, reentregas e intentos, Mixta y calendario del propedéutico.
- D07 / reportes: definición de tarea, tratamiento de otros tipos, denominadores, ponderaciones por curso y redondeo. Los pesos 40/30/10/20 y 100/0/0/0 son únicamente fixtures.
- La correspondencia del libro con evidencia de entregas de Moodle. Un libro real puede no contener fechas/estados de entrega: **no se debe inferir recepción o falta de entrega de una celda de nota vacía**. El JSON ficticio sí contiene ambos datos de forma explícita.
- Formatos y claves reales, cancelaciones de bajas, equivalencias entre plataformas y política de conservación de versiones. No hay reglas institucionales definitivas en esta implementación.

## Esquema de los archivos ficticios

Descargar cada ejemplo desde su tarjeta en `/admin/insumos`, después de seleccionar el ciclo. También hay cuatro ejemplos JSON `p02` en `docs/ejemplos-insumos/`. Se aceptan **JSON UTF-8 `.json`**, máximo **2 MiB / 5000 filas**. El calendario 27-2 admite además el formato XLSX específico del [piloto de importación](IMPORTACION-CALENDARIO-27-2.md); los demás formatos reales XLSX/CSV siguen pendientes.

Todos usan un objeto con estas cuatro propiedades:

```json
{
  "schemaVersion": 1,
  "tipo": "spai",
  "ciclo": "p02",
  "filas": [
    {
      "ciclo": "p02",
      "cursoId": "demo-curso",
      "estudianteId": "demo-e01",
      "estudiante": "Estudiante Ficticio 01",
      "matricula": "DEMO-01"
    }
  ]
}
```

Todos los campos enumerados a continuación son obligatorios; **nullable** significa que debe existir la propiedad pero puede contener `null`. Textos no vacíos de hasta 180 caracteres; identificadores alfanuméricos con guion/guion bajo, sin espacios. No se admiten columnas de fila desconocidas.

| Tipo             | Campos de cada fila                                                                                                                                                                                                                                                                              | Clave sin duplicados           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `calendario`     | `ciclo`, `cursoId`, `asignatura`, `grupoId`, `grupo`, `carreraId`, `carrera`, `modalidad`, `docenteId`, `docente`, `actividadId`, `actividad`, `tipo`, `unidad`, `apertura`, `entrega`, `corte`, `recordarmeCalificar`, `propedeutico`, `pesoTarea`, `pesoIntegradora`, `pesoForo`, `pesoExamen` | curso + actividad              |
| `spai`           | `ciclo`, `cursoId`, `estudianteId`, `estudiante`, `matricula`                                                                                                                                                                                                                                    | curso + estudiante             |
| `bajas`          | `ciclo`, `cursoId`, `estudianteId`, `fechaBaja`                                                                                                                                                                                                                                                  | curso + estudiante             |
| `calificaciones` | `ciclo`, `cursoId`, `actividadId`, `estudianteId`, `entregaEn`, `calificacion`, `calificadaEn`                                                                                                                                                                                                   | curso + actividad + estudiante |

- Modalidades: `escolarizada`, `mixta`, `ejecutiva`, `virtual`, `posgrados`. Tipos: `tarea`, `integradora`, `foro`, `examen`. Unidades de esta entrega: `u01`, `u02`.
- `propedeutico`: booleano. Fechas del calendario y sus cuatro pesos: nullable. Pesos entre 0 y 100, suma 100; alternativamente los cuatro `null`. Metadatos y pesos deben ser coherentes en todas las filas de un curso. Grupos, docentes y carreras con igual ID no pueden contradecir sus datos. SPAI exige identidad/matrícula consistente, incluso entre cursos.
- Fechas: ISO con segundos y zona, por ejemplo `2027-03-04T12:00:00-05:00`. Se valida fecha real, hora y orden apertura ≤ entrega ≤ corte cuando estén presentes; también apertura ≤ corte. El recordatorio no impone otro orden.
- Intervalos ficticios de validación: `p01` desde 2026-09-01 incluido hasta 2027-01-01 excluido; `p02` desde 2027-01-01 incluido hasta 2027-05-01 excluido, en -05:00. No son calendarios oficiales.
- `calificacion`: número entre 0 y 100 o null. `entregaEn` y `calificadaEn`: nullable. Nota no nula requiere ambas fechas; entrega ≤ calificación. Sin nota, `calificadaEn` debe ser null. Para ausencia explícita, los tres campos son null. Una nota posterior al corte no se cuenta todavía como calificada.
- Lista vacía permitida únicamente para `bajas` (declaración explícita de ausencia de movimientos).
- La fila mostrada empieza en **1 dentro de `filas`**, no es la línea física del JSON; los errores del encabezado aparecen como **Archivo**. Se valida todo el archivo; la vista previa limita texto a 2000 caracteres y lista a 10 filas, sin reducir la validación.
- Duplicados, fechas inválidas, campos ausentes, tipo/ciclo equivocado o contradicciones rechazan **todo el archivo**. Correspondencias entre tipos se diagnostican al consultar, para permitir cargas independientes y calendario solo.

### Muestras reales necesarias antes de integración

SPAI: inscripción activa, ciclo, carrera, modalidad, grupo, claves de asignatura/impartición, alumno/matrícula y vigencia. Bajas: identificación de inscripción, fecha efectiva, motivo/tipo, anulaciones y reingresos. Moodle/calendario: ID curso/actividad, tipo, unidad, apertura, entrega, cierre, excepciones, propedéutico y zona horaria. Libro: identificación de alumno/actividad, escala y categorías, pesos, intentos, fecha de evaluación y evidencia complementaria de entrega.

Confirmar con muestras anonimizadas: CSV/XLSX/hojas, encabezados, separadores, codificación, fechas seriales o texto, decimales, marcadores de vacío/cero, fórmulas, cursos compartidos y claves comunes. No renombrar un XLSX como JSON: las plantillas son un contrato explícito de demostración, no un importador de formatos reales.

## Revisión y pruebas

1. Abrir `/reportes` sin parámetros y revisar las tres consultas. La persona Reporte Demo 1 aparece una vez en tarea calificada con dos tareas; docente D muestra sus tres cursos.
2. Filtrar Ejecutiva → EJE-101 → Gestión ejecutiva → Actividad integradora → Unidad 2 → Extemporánea: una entrega pendiente y una persona. Recargar: misma selección. Cambiar ciclo: limpia los filtros dependientes y no recupera insumos de 27-1.
3. Cambiar a Sistemas → `/admin/insumos` → 27-2. Descargar/cargar primero solo calendario, validar y activar. Consultar reportes: calendario visible, totales no calculables.
4. Cargar SPAI y libro de ejemplo: una persona/una entrega calificada con cero. Duplicar una fila o cargar el libro de otro ciclo: rechazo con fila y motivo; la versión anterior sigue disponible. Activar otra versión válida: solo cambia ese tipo y ciclo.
5. Cargar bajas: se excluye el par. Volver a 27-1: conserva sus 31 calificadas y 17 pendientes. Recargar conserva la simulación de la pestaña.
6. Probar acceso directo a Administración como Coordinación/Dirección (restringido), Sistemas (permitido), estados vacío/incompleto/error y pantallas de 1440, 375 y 320 px.

Pruebas unitarias en `core/reporting/reporting.spec.ts`: contrato, duplicados, fechas, pesos, identidades, cero, clasificaciones, conteos, filtros, cruces, bajas, activación y conservación de versiones. E2E `e2e/reports.spec.ts`: filtros, consultas, ciclo, carga parcial/válida/inválida, recarga, acceso directo, teclado, AXE, móvil y capturas adjuntas al reporte Playwright. La suite completa conserva el recorrido original.

El test docente anterior esperaba la recarga inmediatamente tras el clic. Se añade la espera por la URL de ficha ya utilizada en la corrección del PR #4, conservando sus aserciones de búsqueda/regreso; no se incorpora ningún cambio de runner o instalación de navegador.

### Resultado local de la implementación inicial — 12 de noviembre de 2026

Windows, Node **24.14.1**, npm **11.11.0**, Microsoft Edge **157.0.4341.46**, canal `msedge`, modo headless. Playwright ejecutado con `CI=true` para iniciar su propio servidor local, sin reutilizar otra instancia.

| Comprobación                          | Resultado                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run build`                       | Correcto; carga inicial 474.37 kB, sin advertencias de presupuesto.                                    |
| `npm test`                            | 20 pruebas aprobadas, 3 archivos.                                                                      |
| `npm run test:dependencies`           | 4 pruebas aprobadas.                                                                                   |
| `npm run test:e2e`                    | 26 pruebas aprobadas, sin omisiones, aproximadamente 2.5 minutos; 19 escenarios anteriores y 7 nuevos. |
| AXE y desbordamiento horizontal       | Sin infracciones en los escenarios auditados; las dos vistas nuevas se revisaron a 1440, 375 y 320 px. |
| `actionlint .github/workflows/ci.yml` | Correcto; workflow sin modificaciones.                                                                 |
| `git diff --check`                    | Correcto.                                                                                              |

Los E2E verifican también descargas de las plantillas, las cuatro muestras documentadas, archivo vacío, fecha imposible y duplicados por fila. Se corrigió la sincronización del test de teclado esperando el cierre real del selector Material, sin esperas fijas. Las aserciones anteriores de recarga y búsqueda docente permanecen intactas.

Las capturas de las dos vistas en escritorio y móvil se inspeccionaron visualmente y están en `docs/evidencia/reportes-demo/`. El reporte HTML completo y sus adjuntos permanecen en `playwright-report/` (excluido de Git); se abre con `npx playwright show-report`. Los avisos locales de `NO_COLOR`/`FORCE_COLOR` y de prebundling desactivado en modo CI no impidieron la ejecución.

En esa entrega inicial no se ejecutó GitHub/Ubuntu ni se hizo commit, push, PR, merge o despliegue. Se entregaron **31 archivos: 8 modificados y 23 nuevos**, incluidas cuatro capturas.

### Revisión previa a publicación

Se volvió a consultar `origin/main`: conserva la base indicada. Los 31 archivos coinciden exactamente con el inventario inferior; no hay archivos ajenos ni temporales entre ellos. Se inspeccionaron las cuatro capturas y los cuatro JSON: contienen exclusivamente fixtures (nombres Demo/Ficticio e identificadores sintéticos).

Corrección de la revisión: con solo calendario, Reportes ahora identifica **Exportación SPAI** y **Libro de calificaciones** como fuentes obligatorias faltantes, en lugar de sus claves técnicas. También advierte la ausencia de **Movimientos de bajas** desde esta etapa; sin ese insumo, la población se considera provisional. El calendario activo permite revisar actividades, fechas y pesos, pero no sustituye a esas fuentes ni permite presentar totales completos.

Se ampliaron las pruebas para confirmar: calendario v1 → v2 visible en Reportes, rechazo de una sustitución inválida conservando v2, recarga, aislamiento entre ciclos y entre pestañas independientes; consulta de Reportes por Coordinación y Dirección; 65% de avance separado de los pesos por curso; un segundo antes, el instante exacto y un segundo después del cierre en Ejecutiva/Virtual/Posgrados, y de la fecha de entrega en Escolarizada. El límite es inclusivo; el instante posterior es extemporáneo. Se comprueba también que mover o quitar el recordatorio no cambia la clasificación y que la evidencia posterior al corte de consulta aún no se contabiliza.

`sessionStorage` pertenece a la sesión de la pestaña y al origen. Recargar conserva la simulación; pestañas independientes no comparten activaciones. Duplicar una pestaña o abrirla con `opener` puede copiar su estado inicial según el navegador, sin sincronizar cambios posteriores. Los perfiles siguen siendo simulados, no autorización de servidor.

El PR #4 permanece abierto al revisar esta rama. Sus fallos documentados fueron DNS durante `playwright install --with-deps msedge` (APT 100) y posteriores `startup_failure` sin jobs. Esos resultados no son fallos de los escenarios de Reportes. Este PR conserva el workflow de main y solo comparte la espera de URL del test de recarga docente; no copia el ajuste de espejos APT del PR #4. El resultado Ubuntu del nuevo SHA debe consultarse en la ejecución automática de este PR.

**Resultado de la revisión local (12 de noviembre):** build correcto (474.37 kB iniciales), **25 unitarias**, **4 pruebas de compatibilidad** y **27 E2E Edge** aprobadas, sin omisiones. La suite completa tardó 2.9 minutos, con `CI=true` y servidor propio en Windows/Node 24.14.1. El recorrido original mantiene **6 pendientes: 4 vencidos y 2 en plazo**. `actionlint`, Prettier y `git diff --check` correctos. No hubo hallazgos pendientes que bloquearan la publicación del PR de la demo; formatos reales y definiciones de Academia siguen fuera de esta aprobación. Estos resultados locales no certifican la instalación APT del runner Ubuntu.

## Archivos de la entrega

```text
docs/ejemplos-insumos/bajas-p02-ficticio.json
docs/ejemplos-insumos/calendario-p02-ficticio.json
docs/ejemplos-insumos/calificaciones-p02-ficticio.json
docs/ejemplos-insumos/spai-p02-ficticio.json
docs/REPORTES-INSUMOS-DEMO.md
e2e/demo.spec.ts
e2e/reports.spec.ts
e2e/teachers.spec.ts
README.md
src/app/app.html
src/app/app.routes.ts
src/app/core/navigation-context.ts
src/app/core/reporting/cycle-input-store.ts
src/app/core/reporting/input-validation.ts
src/app/core/reporting/report-fixtures.ts
src/app/core/reporting/report-models.ts
src/app/core/reporting/report-selectors.ts
src/app/core/reporting/reporting.spec.ts
src/app/features/admin/cycle-inputs/cycle-inputs.html
src/app/features/admin/cycle-inputs/cycle-inputs.scss
src/app/features/admin/cycle-inputs/cycle-inputs.ts
src/app/features/home/home/home.html
src/app/features/reports/reports/reports.html
src/app/features/reports/reports/reports.scss
src/app/features/reports/reports/reports.ts
src/app/shared/_report-layout.scss
src/app/shared/context-filters/context-filters.ts
docs/evidencia/reportes-demo/reportes-1440.png
docs/evidencia/reportes-demo/reportes-375.png
docs/evidencia/reportes-demo/insumos-1440.png
docs/evidencia/reportes-demo/insumos-375.png
```

Los directorios temporales `tmp`, `dist`, `playwright-report`, `test-results` y la caché Angular permanecen excluidos por `.gitignore`. Las cuatro capturas anteriores son evidencia seleccionada, no resultados temporales para publicar automáticamente.

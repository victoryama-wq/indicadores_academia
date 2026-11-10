# Seguimiento docente de consulta · demo local

Base: main 4cad7bb7ab57a9b9e15e0cb1d7dee9b65d504a42 (PR #2). Rama: feat/seguimiento-docente-demo. Este documento conserva la evidencia de la entrega local inicial y la revisión previa a su publicación para revisión mediante PR. No incluye merge ni despliegue.

## Referencia y contrato

Se contrastó con Requerimientos_Indicadores_Academia_v0_5.docx, disponible en la carpeta superior del proyecto (no forma parte del repositorio): RF01/RF02, IND01–IND09, REP04 y recorrido docente de RF17. Academia sigue revisándolo; este módulo no convierte propuestas en reglas aprobadas.

| Indicador | Unidad y ámbito |
| --- | --- |
| Estudiantes únicos | Identificadores distintos de estudiante dentro de los registros filtrados; una persona se cuenta una vez aunque participe en varias actividades o asignaturas. |
| Registros esperados | Pares únicos estudiante–actividad precargados; no intentos ni archivos. |
| Entregas recibidas | Pares con entrega calificada o pendiente; excluye sin entrega. |
| Entregas calificadas | Pares con estado calificada; cero es una calificación válida. |
| Entregas pendientes | Pares recibidos sin calificar, agrupados por responsable de la impartición. No cuenta estudiantes únicos. |
| Pendientes vencidos / en plazo | Subconjuntos disjuntos de pendientes al corte fijo. |
| Grupos / imparticiones | Identificadores distintos dentro de la selección del docente. Una impartición vincula grupo, asignatura y responsable. |

El adaptador garantiza una fila por estudiante–actividad. Las pruebas verifican esta unicidad. Un futuro adaptador deberá resolver intentos y versiones antes de entregar el Snapshot; no se elige silenciosamente un registro duplicado. Los selectores puros academic-selectors.ts calculan cada actividad, impartición y docente a partir de sus propias filas. Los filtros se aplican en AcademicDataSource antes de agregar; QueryStore cancela consultas obsoletas y separa carga, error, selección vacía y corte incompleto. Un corte incompleto nunca se presenta como cero pendientes.

## Datos ficticios comprobables

| Docente | Imparticiones | Personas únicas | Pares esperados | Calificadas | Pendientes | Vencidas | En plazo |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A (d01) | ENF-301 / Enfermería Clínica; ENF-401 / Salud Comunitaria | 31 | 36 | 21 | 9 | 6 | 3 |
| B (d02) | ENF-401 / Farmacología | 4 | 4 | 2 | 2 | 1 | 1 |
| C (d03) | ADM-201 / Administración I | 2 | 2 | 2 | 0 | 0 | 0 |
| Todo el conjunto | 3 grupos, 4 imparticiones, 5 actividades | 36 | 42 | 25 | 11 | 7 | 4 |

Las personas únicas por docente suman 37, pero el conjunto contiene 36: e031 participa con A y B. La persona e019 tiene pendientes en varias actividades de A. Esto es deliberado para detectar sumas incorrectas. ENF-301/i01/a01 conserva exactamente sus 30 registros, 18 calificados, seis pendientes (cuatro vencidos, dos en plazo) y seis sin entrega.

## Supuestos que debe validar Academia

- **D01, vencimientos:** estados ilustrativos precargados al 6 de noviembre de 2026, zona America/Cancun; no dependen del reloj actual. No se implementan días hábiles, plazos oficiales, prórrogas ni reglas de reentrega.
- **D02, población y vigencias:** los pares y pertenencias están precargados. La demo no resuelve bajas, cambios de grupo, afiliación principal ni actividades no aplicables.
- **D03, responsabilidad:** un responsable inequívoco por impartición. Compartir un grupo no mezcla docentes. Cursos compartidos, responsables múltiples y asignaciones ambiguas requieren una decisión y gestión de incidencias antes de una integración real.
- **D04/D06, entrega y evaluación:** una fila vigente por par; cero válido. No se infiere publicación al estudiante, entrega válida en Moodle ni conciliación con libro de calificaciones.
- **D05/D08, cortes y ámbito:** calendario ilustrativo y catálogo completo de datos ficticios común a los perfiles. Coordinación, Dirección y Sistemas siguen siendo simulaciones en sessionStorage. Dirección no tiene vista previa de exportación; Sistemas conserva su menú adicional. No hay autenticación ni autorización de servidor. El acceso a datos reales deberá autorizarse en backend, también para el catálogo.
- No se genera ranking docente, notificaciones ni archivos oficiales. Los formatos de reporte y exportación siguen pendientes.

## Navegación y arquitectura

- /docentes: listado, búsqueda local sin nombres en URL y filtros de periodo, corte, carrera, modalidad, grupo, impartición, docente, tipo y unidad. La entrada directa sin parámetros usa todo el ámbito demo; los enlaces del menú conservan la selección vigente.
- /docentes/:docenteId: resumen y desglose por grupo, asignatura y actividad. Un identificador desconocido se distingue de un docente válido sin resultados para los filtros.
- Los enlaces a pendientes mantienen el contexto y agregan origenDocente. El retorno al docente y al listado conserva los filtros; la búsqueda docente persiste en la pestaña incluso tras recarga. La ficha del estudiante regresa a la actividad real y conserva estado, orden y paginación.
- Las rutas existentes obtienen grupo/asignatura/actividad de los datos, no de g01/i01/a01 fijos. Cada fila muestra sus propios totales. La vista previa también identifica la actividad y población correctas.
- Se reutilizan ACADEMIC_DATA, AcademicDataSource, QueryStore, NavigationContext, ContextFilters, Metrics, RecordList, Material y estilos compartidos. Dos componentes nuevos de carga diferida; sin nuevas dependencias.

## Recorrido para revisión local

1. Abrir /docentes; si se llega desde Inicio, pulsar Ver todo el ámbito demo. Comprobar A: 21 calificadas / 9 pendientes; B: 2 / 2; C: 2 / 0.
2. Buscar Demo A, entrar mediante Ver detalle. Comprobar 31 estudiantes únicos y 36 pares esperados, con dos grupos e imparticiones.
3. En Salud Comunitaria abrir los pendientes de Diagnóstico comunitario (a02): dos registros, uno vencido y otro en plazo. Abrir la ficha de Estudiante Demo 019: pertenece a ENF-401 y Salud Comunitaria.
4. Recargar, volver al listado de estudiantes, al detalle docente y al listado. Deben persistir filtros y búsqueda Demo A.
5. Limpiar consulta. Filtrar ENF-401 y Farmacología: solo B, dos pendientes. Consultar C: cero pendientes; su actividad no debe mostrar registros pendientes.
6. Probar periodo 27-2, corte incompleto, error simulado y /docentes/desconocido. Revisar con teclado y en móvil (320/375 px).
7. Repetir Inicio → ENF-301 → Enfermería Clínica → Plan de cuidados → seis pendientes: cuatro vencidos y dos en plazo.

## Archivos de la implementación

- Nuevos: features/teachers/teachers y features/teachers/teacher-detail (TypeScript, HTML y SCSS), core/academic-selectors.ts y su prueba unitaria, e2e/teachers.spec.ts y este documento.
- Contratos y navegación: core/models.ts, core/demo-data.ts, core/navigation-context.ts, app.routes.ts, app.ts y app.html.
- Reutilización de UI: shared/context-filters, shared/metrics, shared/record-list y shared/export-preview.
- Recorridos existentes corregidos: Home (TS/HTML), Groups, GroupDetail, SubjectDetail, ActivityDetail y Followup. Se eliminan destinos fijos y totales globales usados como filas.
- Documentación y regresión: README.md y e2e/demo.spec.ts. La modalidad Mixta ahora tiene datos en Administración; una selección vacía muestra cero sin un enlace falso a a01.
- Sin cambios en package.json, package-lock.json, playwright.config.ts ni .github/workflows/ci.yml.

## Validación de la entrega local inicial

Comprobaciones locales del 10 de noviembre de 2026, Windows, Node 24.14.1, npm 11.11.0 y Microsoft Edge 157.0.4341.46:

| Comando / comprobación | Resultado |
| --- | --- |
| npm run build | Correcto, código 0. Carga inicial 472,62 kB, inferior al aviso de 500 kB; sin advertencias de presupuesto. |
| npm test | 7 pruebas unitarias correctas (3 originales y 4 nuevas). |
| npm run test:dependencies | 4 comprobaciones correctas. |
| CI=true npm run test:e2e | 18 pruebas correctas, 1,7 min, código 0. Playwright inició su propio servidor y utilizó Edge headless; sin reintentos ni pruebas omitidas. |
| Accesibilidad / navegación | AXE sin infracciones detectadas; sin desbordamiento horizontal en los recorridos comprobados. Módulo docente a 1440, 375 y 320 px; recorrido original en siete anchos de 320 a 1440 px. |
| git diff --check | Sin errores de espacios. |

Se comprobaron conteos aislados por docente, personas frente a pares, filas de impartición/actividad, búsqueda y filtros, teclado, recarga y retorno con contexto, docente sin pendientes, selección vacía, identificador inválido, corte incompleto y error. El recorrido anterior mantiene seis pendientes: cuatro vencidos y dos en plazo.

Durante la validación se corrigieron una discrepancia de nombre accesible (Ver detalle), la recarga prematura del propio E2E antes de completar navegación y la indicación de menú activo en acceso directo. La prueba de selección vacía ahora comprueba cero sin enlace a una actividad ajena. No se relajaron los conteos ni las comprobaciones AXE. La última suite completa quedó en 18/18.

Capturas finales revisadas visualmente:

| Vista | Escritorio | Móvil |
| --- | --- | --- |
| Listado | [1440 px](evidencia/docentes/docentes-1440.png) | [375 px](evidencia/docentes/docentes-375.png) |
| Detalle de A | [1440 px](evidencia/docentes/docente-detalle-1440.png) | [375 px](evidencia/docentes/docente-detalle-375.png) |

El reporte HTML local queda en playwright-report/index.html y las capturas de prueba en test-results/ (ambos ignorados por Git). Las capturas anteriores de docs/evidencia no se sobrescribieron. CI=true configura la ejecución local del servidor; no significa validación en Ubuntu. En esa entrega inicial todavía no se había solicitado ejecutar esta rama en GitHub; la comprobación de Ubuntu corresponde al PR posterior.

Estado de la entrega local inicial (antes de la autorización de publicación): rama feat/seguimiento-docente-demo; HEAD y main permanecían en 4cad7bb7ab57a9b9e15e0cb1d7dee9b65d504a42. El árbol inicial estaba limpio. Los cambios se entregaron locales y sin preparar en el índice. No hubo commit, push, PR, cambio de ruleset ni despliegue. El servidor local de demostración se restaura en 127.0.0.1:4300 para revisión.

## Revisión previa a publicación

Se volvió a verificar el remoto victoryama-wq/indicadores_academia, la rama y main en la base indicada. Los 33 archivos reportados corresponden al módulo y sus recorridos afectados: 19 archivos modificados, 10 archivos nuevos de código/pruebas/documentación y cuatro PNG ficticios. tmp/, dist/, node_modules/, .angular/cache/, playwright-report/ y test-results/ están ignorados; no forman parte del commit.

**Hallazgo corregido:** la búsqueda de estudiantes era global. Buscar 019 en a02 (docente A) y abrir a04 desde Farmacología (docente B) arrastraba el texto y mostraba cero registros, pese a existir cuatro. NavigationContext ahora conserva una búsqueda por identificador de actividad, con estado reactivo en memoria y persistencia opcional en sessionStorage. La ficha y la recarga recuperan la búsqueda de su actividad; abrir una cifra limpia solo la búsqueda de la actividad de destino. La búsqueda docente sigue conservándose por separado.

Se añadió una regresión E2E que cruza docentes, limpia el filtro de B y vuelve a la ficha/actividad de A, comprobando que su búsqueda se conserva. No se modificaron datos, plazos, criterios de conteo, perfiles ni reglas institucionales. Las cuatro capturas mantienen la interfaz revisada; el workflow del PR conserva capturas de su ejecución en Ubuntu, que se verificarán al finalizar.

La publicación autorizada se limita al commit, push de esta rama y PR hacia main. Los resultados del workflow y sus artefactos se registrarán en el PR, separados de las pruebas locales. Academia mantiene pendientes D01–D08 según los supuestos descritos arriba.

Validación repetida tras la corrección (Windows, Node 24.14.1): build correcto, 472,68 kB de carga inicial; 7/7 unitarias; 4/4 de compatibilidad; 19/19 E2E Edge, 1,9 min, código 0; AXE sin infracciones detectadas. actionlint y git diff --check correctos. La regresión original conserva seis pendientes (cuatro vencidos y dos en plazo).

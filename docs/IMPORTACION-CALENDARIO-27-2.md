# Piloto local: importación del calendario operativo 27-2

## Base y alcance

Rama `feat/importacion-calendario-27-2`, creada desde `main` actualizado por fast-forward a
`7054f19e2a94a557a9176c5d12b21fd4e167816a` (integración del PR #5). El árbol estaba limpio.
PR #4 cerrado como sustituido según la referencia de esta etapa; no se modifica su workflow.
La entrega inicial fue local. La revisión del 13 de noviembre autoriza publicar esta rama
en un PR abierto después de las comprobaciones; no autoriza merge ni despliegue.

Se reutiliza `/admin/insumos`: seleccionar → validar → revisar → activar. El XLSX se lee
localmente y se normaliza; no se modifica el documento fuente ni se contacta Moodle.
La activación usa el mismo `CycleInputStore`, con revalidación y reemplazo atómico por tipo/ciclo.
Los perfiles siguen simulados y el almacenamiento sigue siendo `sessionStorage` por pestaña
y origen. Una recarga conserva la versión; otra pestaña independiente no comparte sus cambios.

## Referencia inspeccionada

Se localizó en Drive el Google Sheet **CALENDARIO OPERATIVO MOODLE 27-2** y se exportó a XLSX
el 12 de noviembre de 2026. No faltó la referencia real.
Copia local excluida de Git: `tmp/calendario-operativo-27-2-referencia.xlsx`.
SHA-256: `E7EDE46D5D9BDCC17DE0EA77F9FFDC4989638900F6B9A0BC4482B6D04D593C51`.
El lector reconoce sus **84 actividades**, sin rechazos:

| Pestaña                        | Título / encabezado / actividades | Bloque                                    |
| ------------------------------ | --------------------------------- | ----------------------------------------- |
| CALENDARIO OPERATIVO ESC-SALUD | 1 / 2 / 3–23                      | Escolarizada, unidades 1–7, parciales 1–3 |
| CALENDARIO VIRT, EJE, POSGRADO | 1 / 2 / 3–23                      | Transversales, módulo 1                   |
| CALENDARIO VIRT, EJE, POSGRADO | 29 / 30 / 31–51                   | Transversales, módulo 2                   |
| CALENDARIO VIRT, EJE, POSGRADO | 54 / 55 / 56–76                   | Profesionalizantes, módulos 1 y 2         |

Los números de fila son evidencia de esta copia, no posiciones fijas del lector. Cada título
reinicia el contexto de unidad/parcial y cada encabezado resuelve sus propias columnas.
Se aceptan espacios, saltos de línea y acentos en encabezados. La unidad y el parcial se
propagan únicamente dentro del bloque; fechas y recordatorios no se propagan.
La nota pedagógica final de Escolarizada no es una actividad.
Los títulos de los bloques compartidos deben identificar Ejecutiva, Virtual y Posgrado;
si falta una modalidad se rechaza el archivo, sin atribuirle modalidades por inferencia.

## Contrato del piloto

- Solo `.xlsx` del formato inspeccionado, dos pestañas y cuatro bloques completos;
  siete unidades con integradora, foro y examen por bloque. No es un importador genérico.
- Se conserva JSON para los contratos ficticios existentes. SPAI, bajas y libro siguen
  pendientes de muestras reales; no se incorporan sus lectores XLSX/CSV.
- Límite de archivo 2 MiB, máximo 5000 filas por pestaña y 5000 actividades normalizadas.
- Fechas Excel, seriales enteros del sistema 1900, texto `DD/MM/AAAA` o `AAAA-MM-DD`;
  horas Excel, fracciones del día o `HH:mm[:ss]`. Fecha imposible, hora inválida, orden
  invertido, fuera del intervalo piloto, encabezado ausente/duplicado, actividad repetida,
  ciclo distinto o bloque incompleto rechazan el archivo entero.
- Fechas de pared en Cancún (`-05:00`), independientes del huso del equipo. Apertura sin
  hora se interpreta a las **00:00**, supuesto explícito pendiente de Academia. El intervalo
  piloto permanece enero–abril de 2027; no se extiende automáticamente por el archivo.
- Escolarizada: apertura, entrega y corte separados; conserva el parcial y su porcentaje
  original. Ejecutiva, Virtual y Posgrados: apertura y corte como cierre, entrega `null`.
- El bloque profesionalizante dice **FECHA DE ENTREGA** en origen. Por la instrucción de
  este piloto se mapea a corte/cierre; esa equivalencia se muestra en ambas vistas.
- “Recordarme calificar” conserva el texto original, incluidos rangos y vacíos. Es interno,
  no se convierte a una fecha puntual, no cambia cierres y no genera avisos o incumplimientos.
- La columna informativa de captura en SAEKO y la nota pedagógica no se convierten en
  actividades, cierres ni reglas de calificación en este piloto.
- **Propedéutico: Calendario pendiente**. No se inventan actividades ni fechas.
- Ponderación de origen por actividad y parcial/bloque: se conserva, no se suma como peso
  de curso ni se usa para calcular avance. La fuente no identifica curso Moodle ni categorías
  reales; confirmar ponderaciones y agregación con Academia.
- No se calculan fórmulas ni macros; se leen valores disponibles del XLSX. Exportar una copia
  con valores actualizados. Fórmulas sin valor disponible o fechas sin criterio se rechazan.

## Calendario general y Reportes

El libro no contiene identificadores de curso, actividad Moodle, carrera, grupo, docente o
estudiante. Por eso la programación se guarda en `programacion`, separada de `filas` de
imparticiones. Los dos conjuntos son excluyentes en una misma versión. No se crean cursos
ni personas ficticias para hacer corresponder una plantilla general con una entrega.

Reportes muestra la programación vigente del ciclo, su versión y sus bloques desplegables.
Modalidad, unidad 1–7 y tipo filtran las actividades del calendario. Carrera, grupo, docente y
asignatura concretos no tienen correspondencias todavía y producen vacío, no una equivalencia
inventada. Extemporáneas clasifica entregas; no clasifica una programación sin entregas.
Los totales permanecen **no calculables por vinculación pendiente**, incluso si se cargan
los otros JSON ficticios. Se mantienen avisos de SPAI/libro faltantes y de población provisional
sin bajas. Cambiar a 27-1 usa exclusivamente sus propias versiones y conserva el recorrido
original de seis pendientes (cuatro vencidos, dos en plazo).

## Recorrido para revisar

1. Abrir la demo, elegir **Sistemas** y Administración → **Insumos por ciclo** → **27-2**.
2. En Calendario Moodle seleccionar la copia de referencia local o
   `docs/ejemplos-insumos/calendario-27-2-ficticio-valido.xlsx`.
3. Pulsar **Validar archivo**: 84 actividades, cero rechazos. Desplegar cada bloque de la vista
   previa y revisar origen, fechas y ponderaciones. Pulsar **Activar simulación**.
4. **Consultar reportes de este ciclo**: misma versión y programación; avisos de fuentes y
   vinculación pendientes. Filtrar Virtual + Unidad 7 + Foro: tres actividades, una por bloque.
5. Volver a Insumos, cargar `calendario-27-2-ficticio-fecha-invalida.xlsx`: rechazo en pestaña
   VIRT/EJE/POSGRADO, fila 31. Activación deshabilitada; la versión anterior sigue vigente.
6. Probar `calendario-27-2-ficticio-encabezado-invalido.xlsx`: falta CIERRE en fila 30 del módulo 2,
   sin reutilizar el encabezado del módulo 1. El rechazo tampoco reemplaza la versión vigente.
7. Recargar Reportes, alternar 27-1 y 27-2, probar escritorio y móvil. Los archivos de prueba
   contienen fechas y pesos ficticios y están marcados **MUESTRA FICTICIA**; no son el calendario oficial.

## Verificación

Pruebas específicas en `calendar-xlsx.spec.ts` y `e2e/calendar-import.spec.ts` cubren encabezados
por bloque, columnas reordenadas, fechas/horas/seriales, duplicados, archivo incompleto, versiones,
recarga, filtros, aislamiento de ciclo y accesibilidad. La suite E2E mantiene Microsoft Edge
headless y servidor local propio con `CI=true`. No se cambian workflow, reglas ni omiten pruebas.

Windows, Node 24.14.1, npm 11.11.0, Edge 157.0.4341.46:

| Comprobación                                                 | Resultado                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `npm ci`                                                     | Correcto; 0 vulnerabilidades reportadas                                                              |
| `npm run build`                                              | Correcto; 474.39 kB iniciales, sin avisos de presupuesto                                             |
| `npm test`                                                   | 37 aprobadas en 4 archivos                                                                           |
| `npm run test:dependencies`                                  | 4 aprobadas                                                                                          |
| `CI=true npm run test:e2e`                                   | 30 aprobadas; incluye los 27 escenarios anteriores y 3 nuevos, sin omisiones          |
| Formato y `git diff --check`                                 | Correctos, incluidos los archivos nuevos                                                             |
| Copia XLSX del Google Sheet: lector y flujo completo en Edge | 84 actividades, 0 rechazos, activación v1 y fechas verificadas en Reportes; sin solicitudes externas |

La revisión comparó las 84 filas contra una lectura independiente del XML del XLSX: actividad,
ponderación, apertura, entrega, corte, recordatorio, pestaña/fila, bloque, unidad y parcial.
Los tres resultados del lector ejecutado con `TZ=UTC`, `Asia/Tokyo` y `America/Los_Angeles`
son idénticos (SHA-256 del JSON normalizado
`17FEBBAA2675B589FA44903BB268F01FFD37430F2867587805CEE2009D880CC1`).
La comprobación con el archivo real en Edge, con zona `Asia/Tokyo`, verificó apertura
11/01/2027 00:00, entrega 23/01/2027 23:59 y corte 24/01/2027 23:59 en la primera actividad
escolarizada, siempre en -05:00. Los E2E XLSX también usan Tokio para proteger esta garantía.
La copia real y sus capturas permanecen en `tmp`, excluidas de Git. Solo se incluyen XLSX
ficticios como fixtures reproducibles.

Durante la revisión se corrigió la distinción visual del enlace de Insumos (subrayado persistente).
Los tests JSON ahora localizan la columna **Fila** por su etiqueta, conservando sus aserciones
de fila 1/2 tras añadir **Pestaña**. El test móvil reabre los filtros tras la recreación existente
de la vista al cambiar contexto; espera resultados observables, sin pausas fijas.

La suite conserva seis pendientes originales: cuatro vencidos y dos en plazo. Los nuevos
recorridos verifican teclado/AXE y ausencia de desbordamiento a 1440 y 375 px; los recorridos
anteriores conservan sus otros anchos. Reporte HTML y capturas en `playwright-report` y
`test-results`, excluidos de Git. Los resultados de esta tabla son de Windows; la ejecución
en Ubuntu se documenta por separado en el PR. La suite usa únicamente fixtures incluidos
en el repositorio; no depende de la copia institucional, de Drive ni de archivos en `tmp`.
El XLSX ficticio válido coincide con las 84 filas del fixture TypeScript. Solo se publican los
tres XLSX rotulados como ficticios; la exportación institucional y el parche temporal no se incluyen.

El diff contiene 26 archivos: 14 modificados y 12 nuevos (incluidos los tres XLSX ficticios).
Se agrega `read-excel-file` 9.3.15 fijado en el lockfile, cargado solo al seleccionar XLSX.
El lector/contrato y las pruebas viven en `core/reporting`; `CalendarScheduleView` es compartido
por Insumos y Reportes. No se modifican el adaptador académico original, workflow ni ruleset.

## Pendiente antes de usar fuentes académicas reales

Validar con Academia la hora de apertura, zona/intervalo del ciclo, cierre del bloque
profesionalizante, pesos por parcial/bloque/curso y calendario propedéutico. Obtener muestras
anonimizadas de SPAI, bajas y libro/evidencia de entregas; definir IDs y correspondencias
explícitas entre calendario general, imparticiones y actividades Moodle, intentos y excepciones.
No inferir entrega ni ausencia de ella a partir de una nota vacía. Autenticación real,
persistencia institucional, integración con servicios y despliegue quedan fuera del piloto.

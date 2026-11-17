# Cruce del padrón activo y las imparticiones · 27-1

El cruce responde a dos preguntas: cuántas personas activas tienen al menos una asignatura confirmada y cuántos vínculos estudiante–asignatura se pueden respaldar. Ninguna de las dos cifras mide entregas ni calificaciones. El módulo no consulta Saeko, SPAI ni Moodle por red.

## Recorrido con las muestras ficticias

1. Selecciona **Sistemas → Administración → Insumos por ciclo → 27-1**. En **Padrón activo de Saeko**, carga [el padrón ficticio](ejemplos-insumos/saeko-27-1-ficticio.xlsx). Si conoces la fecha de corte, indícala antes de validar. Revisa las filas y activa. En este punto falta el catálogo de imparticiones.
2. En **Exportación SPAI**, carga [las asignaciones ficticias](ejemplos-insumos/asignaciones-27-1-ficticio.xlsx). Valida y despliega **Consultar filas y evidencia del cruce** antes de activar. La vista previa combina el candidato con la versión vigente del otro insumo. Las dos cargas también pueden hacerse en orden inverso.
3. Comprueba **7 estudiantes activos, 5 vinculados y 6 vínculos**. Cuatro vínculos tienen respaldo por grupo y tres por matrícula; uno tiene ambas vías. Un estudiante elegible queda sin cobertura y uno se excluye por inglés. La matrícula de texto `0003` confirma `TUP0003` de otra carrera; `999` propone `TUP999`, que no figura en la muestra. Un caso C.A tiene evidencia explícita y otro queda por confirmar.
4. Activa el catálogo y abre **Consultar reportes de este ciclo**. Reportes muestra cobertura agregada, la fecha de corte informada y la razón por la que las entregas no se pueden calcular. Recarga y cambia a 27-2: ese ciclo usa solo sus propias versiones. Para ensayar un rechazo, vuelve al 27-1 y carga un padrón con una matrícula duplicada: puede consultarse el error, pero no activar el reemplazo.

## Archivos y vigencia

| Fuente | Columnas que lee el piloto XLSX | Origen del ciclo |
| --- | --- | --- |
| Padrón activo de Saeko | Matrícula, Nombre completo, Correo institucional, Plan de estudios o curso, Grupo, Ciclo. Si existe Estado de inscripción, debe decir Inscrito. El nombre no se divide ni se exige segundo apellido. | Columna Ciclo de cada fila. |
| Catálogo de asignaciones SPAI | ID Moodle (número localizador), Materia, Carrera, Grupo base, Comparte con, Matrícula(s). Las dos últimas celdas pueden estar vacías. | Fila de metadatos `Ciclo` anterior a los encabezados. |

Se busca una sola tabla reconocible entre las primeras 30 filas de cada hoja. Límite de la demo: 2 MiB por archivo y 5,000 filas por lote. Las plantillas JSON de la interfaz muestran el contrato alternativo; el catálogo de asignaciones se distingue de la inscripción precargada por su lista `imparticiones`. Se conservan solo las columnas utilizadas y, para rastrear un vínculo, la hoja, la fila y los valores de origen. La fecha de carga no sustituye a la fecha de corte del padrón.

Cada activación reemplaza un tipo para un ciclo en `sessionStorage` de esa pestaña. Un archivo inválido o que exceda la capacidad de almacenamiento conserva la versión anterior. Sistemas ve el detalle; Reportes solo expone agregados del cruce. Los perfiles son simulados: el almacenamiento del navegador no implementa autenticación ni aislamiento de datos entre usuarios. Los ejemplos y las pruebas del repositorio son ficticios.

## Evidencia y decisiones pendientes

- La matrícula se lee como texto. Se recortan los extremos y se compara en mayúsculas con `^TUP[0-9]+$`. En SPAI las listas aceptan coma, punto y coma o salto de línea. Un fragmento de texto solo numérico recibe `TUP` sin alterar dígitos. Una celda de Excel **numérica** no acredita que se conservaran los ceros iniciales. Sin coincidencia exacta y única en el mismo ciclo, Sistemas debe revisar el original; no se usa nombre, correo ni semejanza numérica para completar un vínculo.
- Para grupos y planes se normalizan espacios, acentos y mayúsculas. `COMPUB` se conserva en la fuente; la clave de comparación es `CONPUB`. El plan de Saeko distingue MBA y MBA 2027; el avance de grupo no cambia el plan. La carrera de la asignatura puede ser distinta del plan de la persona. ING e ING-FCS se excluyen de los indicadores.
- Grupo base y grupos compartidos respaldan membresía ordinaria. C.A conserva su grupo de origen y requiere matrícula individual; sin respaldo figura como **Asignación por confirmar**. Un mismo vínculo con varias vías se cuenta una vez y se muestran sus evidencias. Si el mismo estudiante aparece en distintas filas con el mismo número y título, la identidad de la impartición queda para revisión: ninguna de esas coincidencias ambiguas entra en cobertura confirmada.
- En un mismo ciclo, la validación de SPAI distingue filas por localizador, título y grupo base normalizados. Para contar se reúnen las vías de evidencia de una persona en una misma fila. Si dos filas distintas reclaman a esa persona con el mismo localizador y título, se excluye el vínculo y se señala cada fila implicada: dos incidencias no equivalen a dos estudiantes. El título o el prefijo por separado no identifican una impartición.
- Con padrón y calendario vigentes en 27-2, Reportes distingue el total de población del ciclo de las actividades seleccionadas por los filtros del calendario. Un cero de cobertura confirmado puede coexistir con entregas **no calculables**.
- El número asociado al título en SPAI es un localizador dentro del ciclo. Antes de habilitar indicadores de entregas, verificar la correspondencia con el ID interno de Moodle, las actividades y el libro de calificaciones del curso, y los movimientos de bajas al corte. Un caso propuesto o sin asignatura confirmada no genera pendientes docentes.

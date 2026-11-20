# Piloto local de lectura Moodle

Sistemas vincula las imparticiones activas de SPAI con el catálogo de cursos visible para la cuenta técnica. Abre una asignatura vinculada para consultar sus actividades individuales. El ID interno se obtiene de Moodle en cada vinculación.

## Arranque en Windows

Desde la raíz del proyecto, con Node 24, ejecuta cada línea en PowerShell:

```powershell
npm ci
npm run build
[System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\pilot.mjs --token-stdin
```

Abre **http://127.0.0.1:4380/reportes**, selecciona **Sistemas** y ve a **Administración → Insumos por ciclo**. El perfil muestra el enlace, pero no concede acceso institucional. Introduce la **clave local** impresa en la terminal. Para detenerlo pulsa Ctrl+C. El token se introduce en el indicador oculto de PowerShell. La clave del navegador cambia al reiniciar el servidor. El piloto conserva las filas en memoria mientras se consulta la pantalla. Cerrar la consulta o recargar la página vuelve a pedir la clave.

## Vinculación SPAI y cotejo de dos asignaturas

1. Desde **Insumos por ciclo** en el puerto 4380 selecciona 27-1. Carga el XLSX de asignaciones SPAI o su plantilla JSON. La plantilla de inscripciones contiene estudiantes por curso. Para obtener vínculos Moodle, usa la exportación de asignaciones con número, materia y grupo base. La vista previa valida las filas en la pestaña. Conserva grupo base, «Comparte con», modalidad y docente. Las columnas XLSX opcionales son `Modalidad` y `Docente`. Si faltan, se muestran como «Sin informar». Una carga inválida conserva la versión activa y sus vínculos.
2. Introduce la clave local y activa la versión válida. Node busca el ciclo en el catálogo visible mediante `core_course_search_courses`. Usa búsqueda por texto con el ciclo y comprueba que el total devuelto coincide con los cursos recibidos. La búsqueda requiere que el servicio de lectura pueda invocar esa función. Un error del servicio se muestra como búsqueda no completada y permite reintentar. [Contrato de búsqueda de Moodle 4.5.5](https://github.com/moodle/moodle/blob/v4.5.5/course/externallib.php#L2480-L2547)
3. Revisa los tres totales y las filas. La coincidencia exige número completo al inicio, materia completa y ciclo al final del nombre. Se normalizan acentos, mayúsculas y espacios. Si SPAI antepone una clave académica como `DEM01 - `, se comprueba también el título sin esa clave. Si las dos variantes apuntan a cursos distintos, la fila queda por revisar. Se conserva la distinción de los ceros del número. Una impartición con grupos compartidos cuenta una vez. ING e ING-FCS se excluyen según el criterio del cruce SPAI. Dos cursos candidatos o dos imparticiones que reclaman un curso pasan a **Por revisar**. Sistemas puede cotejar la hoja y fila indicadas, corregir el insumo y reactivarlo.
4. Para **603. Fundamentos de Contabilidad 27-1**, compara el ID de la fila vinculada con el parámetro `id` de la página del curso en Moodle (referencia histórica: 4455). Abre la asignatura e introduce la clave del piloto. El selector lee las tareas del curso. Para cotejar Unidad 1, verifica módulo 53765 y tarea 22041. **Actualizar lectura** vuelve a consultar la asignatura y el corte.
5. Repite con una segunda impartición autorizada de tu archivo. Comprueba su título, ciclo, ID de curso y una tarea en Moodle. Si el curso se localizó pero faltan permisos, la lectura muestra **Curso localizado · acceso a entregas pendiente**. Cambia a 27-2 y verifica que solo aparecen los vínculos del ciclo elegido. Registra únicamente resultados agregados del cotejo.
6. Las versiones SPAI y el resumen de vínculos se conservan en `sessionStorage` de la pestaña del piloto. El servidor local verifica cada consulta contra su tabla en memoria de pestaña, ciclo y versión. Tras reiniciar Node, usa **Volver a vincular versión vigente** en la misma pestaña. Los archivos, grupos, docentes y matrículas de SPAI permanecen en el navegador. El catálogo se consulta con el token del proceso Node. Las entregas y notas se solicitan solo al abrir o actualizar la asignatura o seleccionar otra actividad.

Si `mod_assign_get_assignments` devuelve el curso y avisos de módulo con código `1`, Moodle omitió actividades al comprobar su contexto y el permiso `mod/assign:view`. El piloto ofrece las tareas que Moodle sí devolvió. Cuando todas quedaron fuera, Sistemas debe comprobar los permisos efectivos de la cuenta técnica en la actividad y la visibilidad de su sección. Tras un ajuste autorizado, **Reintentar consulta** vuelve a leer el mismo curso. [Comprobación por módulo en Moodle 4.5.5](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/externallib.php#L372-L388)

## Comprobación funcional

1. Selecciona la Unidad 1 y compara la hora de lectura con la de tu consulta directa de Moodle. Las cifras se calculan desde las filas devueltas; Moodle puede cambiar entre lecturas.
2. Abre «Entregas pendientes de calificar» y «Sin entrega». Las listas calculables muestran nombres y matrículas, y la última modificación de la entrega cuando Moodle la informa. Cuando falte el alcance, el detalle de «Sin entrega» explica el motivo y omite la lista. Volver al resumen mantiene la misma lectura. «Actualizar lectura» consulta nuevamente.
3. Si falta permiso para consultar envíos o calificaciones, el piloto indica el error de lectura de la actividad. Si falla solo la consulta de una fecha o prórroga, la fila afectada muestra «Atraso por confirmar». Las tareas grupales, sin envíos, con escala no numérica o con identidades ocultas requieren tratamiento específico.
4. «Estudiantes identificados en el curso» cuenta las matrículas TUP activas visibles por usuario o correo institucional. Las cuentas sin matrícula identificable se informan aparte. Para interpretar «Sin entrega» hace falta conocer además a quién le correspondía la tarea.
5. La calificación es la de la tarea y del intento vigente. El cero registrado cuenta. Un envío en borrador y un estado desconocido aparecen por separado. El detalle calcula el atraso según la fecha efectiva de Moodle. La clasificación institucional de vencimientos de 27-1 sigue pendiente del calendario oficial. La hora del corte corresponde a la finalización de las consultas a Moodle.

## Población y avance

Cada lectura relaciona curso, módulo, tarea y padrón activo. El cálculo admite un alcance confirmado de todo el curso o una lista completa de destinatarios identificados para esa actividad. En el segundo caso, los faltantes se calculan únicamente dentro de la lista. Una lista incompatible con el padrón o con los envíos observados deja el alcance pendiente. Cambiar de tarea o actualizar solicita un nuevo corte.

Con el mismo token, Node verifica el ID de la cuenta técnica mediante `core_webservice_get_site_info` y lo excluye del padrón académico y de la lista de la tarea. Cada lectura solicita `mod_assign_list_participants` con el ID de tarea, todos los grupos visibles (`groupid=0`), búsqueda vacía y sin límite de filas. Comprueba los IDs contra un cotejo independiente vigente y el estado de cada participante contra los envíos del intento más reciente. Una fila ausente, duplicada, inesperada o con estado incompleto deja **Sin entrega (No calculable)**, conservando los envíos y notas verificables. Si falla la identificación de la propia cuenta, el piloto informa el error de lectura.

En el código oficial de Moodle 4.5.5, el listado pasa por la visibilidad de grupos, la capacidad de entregar, la asignación de calificadores y los filtros de disponibilidad de sección y actividad aplicables a listas de usuarios. Algunas restricciones no se aplican a esas listas. Pedir todos los grupos visibles o recibir el número esperado de filas es insuficiente para acreditar que llegaron todos los destinatarios. La edición y configuración instaladas deben cotejarse con el token institucional. [Servicio de tareas](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/externallib.php) · [Participantes de la tarea](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/locallib.php) · [Filtros de sección](https://github.com/moodle/moodle/blob/v4.5.5/availability/classes/info_module.php) · [Condiciones aplicables a listas](https://github.com/moodle/moodle/blob/v4.5.5/availability/classes/tree.php)

El avance divide las calificadas entre las calificadas más las pendientes del intento correspondiente. Si el denominador es cero y hay casos por revisar o falta confirmar la población, muestra **Avance por confirmar**. Una lectura completa de población confirmada sin envíos determinados ni casos por revisar muestra **Sin entregas**. Ambos estados omiten la barra y el cociente. Los fallos en las consultas de envíos o notas detienen el resumen.

### Cotejo local de Sistemas para Unidad 1

1. Desde la raíz del proyecto, prueba el servicio con el token de la cuenta técnica. Este comando de PowerShell consulta la versión instalada, el catálogo y los participantes visibles. Imprime identificadores de actividad y conteos agregados. Puede ejecutarse mientras el servidor anterior sigue abierto.

   ```powershell
   [System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\pilot.mjs --token-stdin --comprobar-participantes 22041 --curso 4455
   ```

   Si el servicio deniega `mod_assign_list_participants`, el administrador de Moodle puede revisar en **Administración del sitio → Servidor → Servicios web → Servicios externos** si el servicio del token incluye esa función de lectura. Verifica además que la cuenta técnica pueda ver la tabla de calificación de esa tarea y los grupos necesarios. Repite el mismo comando tras cualquier decisión de Sistemas. `core_webservice_get_site_info` aporta el ID de la cuenta del token y el build con los que se vincula el cotejo.

2. En la versión instalada revisa con Sistemas la configuración de la **sección y la actividad**, las restricciones por grupo o agrupamiento y las excepciones. En la tabla de calificación comprueba la visibilidad de todos los grupos y la asignación de calificadores con una vista autorizada que cubra el conjunto completo. Determina los IDs Moodle de **todos los estudiantes a quienes corresponde la tarea**, incluidos quienes ya entregaron. Puedes obtener cada ID del enlace al perfil. Verifica por separado el ID de la cuenta técnica desde su perfil. Si no puedes establecer la población por identidad de forma independiente de la consulta REST, conserva «No calculable».

   **Cuando Sistemas ha comprobado que la tarea corresponde a todo el curso**, se puede preparar el cotejo automáticamente. Desde PowerShell en esta carpeta, el siguiente comando pide el ID de tarea, el total académico comprobado independientemente y el límite de vigencia. Se usa la fecha y zona que indique el operador. Node cruza cada ID activo con los participantes y el estado de su último envío, excluye la cuenta técnica y solo guarda el archivo si la comprobación completa pasa.

   ```powershell
   $tarea = Read-Host 'ID de tarea'; $total = Read-Host 'Estudiantes activos que deben entregar'; $hasta = Read-Host 'Vigente hasta (ISO con zona)'; [System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\cotejar-curso.mjs $tarea $total $hasta (Read-Host 'ID del curso Moodle')
   ```

   El archivo se guarda en `%LOCALAPPDATA%\cotejo-moodle.json` por defecto. Con el servidor actualizado, pulsa **Actualizar lectura** y abre **Sin entrega**. Cada actualización comprueba que el padrón activo conserve las identidades cotejadas para todo el curso. Si cambia la matrícula, cambia la asignación o vence la vigencia, revisa el alcance antes de renovarlo. Para una tarea dirigida a un subconjunto del curso, utiliza el cotejo específico del paso 3.

3. Guarda ese cotejo únicamente en el equipo, fuera del repositorio, en un JSON UTF-8. Este ejemplo es **ficticio**. Sustituye los identificadores, el build exacto impreso por el diagnóstico y los límites de vigencia por los del cotejo. `userIds` incluye exclusivamente estudiantes, cada uno una sola vez. Acota la vigencia al intervalo que puedas respaldar. Si cambian las restricciones o asignaciones, retira o actualiza el cotejo antes de la siguiente lectura.

   ```json
   {
     "courseId": 701, "assignmentId": 801, "cmid": 901, "serviceUserId": 999,
     "version": "2025010100", "verifiedAt": "2026-01-12T09:00:00-05:00",
     "validUntil": "2026-01-12T09:15:00-05:00", "userIds": [51, 52, 53]
   }
   ```

4. Usa la ruta de ese archivo en la misma terminal de arranque. Por ejemplo, para un archivo privado guardado directamente en tu carpeta local de aplicaciones:

   ```powershell
   $env:MOODLE_COBERTURA_LOCAL = Join-Path $env:LOCALAPPDATA 'cotejo-moodle.json'
   ```

   Una vez disponible el puerto 4380, inicia el servidor **de esta rama** con el comando de entrada oculta de «Arranque en Windows». El proceso relee el cotejo, la identidad y los estados en cada actualización. El archivo se queda en Node. Si falta, caducó o hay discrepancias, el detalle explica el motivo. Si el piloto anterior está abierto, termínalo con Ctrl+C en su propia ventana cuando concluyas su revisión.

5. Abre Reportes → Sistemas → piloto → Unidad 1. Anota la hora de Cancún del resumen, abre **Sin entrega** y compara el conjunto exacto de matrículas con los perfiles de las filas «Sin entrega» de Moodle en ese corte, excluida la cuenta técnica por ID. Volver al resumen conserva la hora. Si llegó un envío o una nota entre consultas, actualiza ambas vistas y registra la hora y los conteos del nuevo corte. Conserva las identidades en el equipo. El calendario oficial de 27-1 continúa pendiente para clasificar vencimientos.

## Atraso según Moodle

El detalle **Sin entrega** usa las mismas filas que acreditó el cotejo de la tarea. Para cada una muestra el vencimiento efectivo en Cancún y calcula el atraso contra la hora de lectura que aparece en el encabezado. Entrar, volver y entrar de nuevo conserva ese corte. **Actualizar lectura** vuelve a consultar población, estados y fechas.

La referencia es la **tabla de calificación de la tarea** en Moodle 4.5.5. Esa tabla da prioridad a la prórroga individual y después a la fecha ajustada de entrega. Moodle resuelve el ajuste aplicable al usuario o a su grupo. El atraso comienza en el primer segundo posterior al vencimiento. La duración utiliza la unidad mayor y la inmediatamente inferior cuando esta última tiene valor: por ejemplo, 3 horas y 7 minutos en un atraso inferior a un día. La fecha de cierre, el recordatorio de calificación y el calendario de 27-2 quedan fuera del cálculo. [Cálculo de la tabla](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/gradingtable.php#L1096-L1105) · [Comparación al segundo](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/gradingtable.php#L1265-L1271) · [Formato de duración](https://github.com/moodle/moodle/blob/v4.5.5/lib/moodlelib.php#L1745-L1816)

**En plazo** incluye el instante exacto de vencimiento. **Sin fecha de entrega** exige una fecha individual explícita de cero y ausencia de prórroga. **Atraso por confirmar** indica que falta información, por ejemplo, una prórroga anunciada sin fecha legible. El estudiante conserva su lugar en la lista y el avance de calificación mantiene su denominador.

### Comprobación por Sistemas

1. Desde la raíz de esta copia, ejecuta en PowerShell el diagnóstico independiente del servidor. Comprueba qué funciones anuncia el token y cuántas filas tienen una respuesta de fecha determinada (incluido el cero explícito). Si el cotejo ya venció, el diagnóstico puede probar una fila visible de la tabla y la identifica como muestra técnica. Esa muestra no actualiza ni acredita la población académica.

   ```powershell
   [System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\pilot.mjs --token-stdin --comprobar-fechas 22041 --curso 4455
   ```

   Para comprobar una prórroga concreta, coloca entre el ID de tarea y `--curso` el ID Moodle de esa persona, obtenido localmente de su perfil. El comando imprime solo disponibilidad y conteos. `mod_assign_get_participant` aporta `duedate` con los ajustes del usuario/grupo y señala la existencia de una prórroga. `mod_assign_get_user_flags` aporta `extensionduedate` para la tarea y el usuario cuando Moodle indica una prórroga. Una función anunciada puede tener alcance insuficiente para una fila. [Contrato de participante](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/externallib.php#L2856-L2908) · [Prórrogas](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/externallib.php#L1082-L1154)

2. Comprueba que el cotejo de población esté vigente para la tarea seleccionada. El diagnóstico se puede usar durante una presentación. Para revisar la interfaz institucional, utiliza el servidor de **esta copia** cuando el puerto 4380 esté libre.
3. Abre Reportes → Sistemas → piloto Moodle → Unidad 1 → **Sin entrega**. Anota el corte de Cancún. Por cada matrícula, contrasta la fecha que aparece en el piloto con la prórroga o el ajuste vigente en la tabla de calificación de Moodle. Si Moodle se abre más tarde, compara la diferencia entre el vencimiento y el corte anotado, ya que la pantalla de Moodle usa su propia hora de consulta. Si cambió el envío o la fecha, toma un nuevo corte en ambas vistas.
4. Conserva el cotejo por matrícula en el equipo de Sistemas. Para la documentación del proyecto registra solo la hora de corte y los resultados agregados.

### Cotejo institucional de Unidad 1

El 19 de noviembre de 2026 a las **14:16:30, hora de Cancún (UTC−05:00)**, Sistemas verificó 24 destinatarios académicos en Unidad 1 de Fundamentos de Contabilidad 27-1, excluida la cuenta técnica. Hubo 4 estudiantes sin entrega. Sistemas comparó por matrícula la fecha efectiva y el atraso en Moodle al mismo corte. Ambos valores coincidieron en las 4 filas, con 0 discrepancias.

Las cuatro fechas provinieron de `mod_assign_get_participant`. Moodle anunció también `mod_assign_get_user_flags`. Ninguna de esas filas indicó una prórroga. **Queda pendiente cotejar una prórroga individual real** cuando exista un caso que requiera consultar esa función.

## Servicio web

El token queda en el proceso Node. El destino de las peticiones REST está fijado en el servidor. El curso se resuelve desde el vínculo activo y el lector verifica que la tarea esté en ese curso. La clave local permite exclusivamente estas consultas. La tabla indica las funciones que debe autorizar el servicio web, con un alcance efectivo de lectura de toda la población del curso.

| Función | Uso |
| --- | --- |
| core_course_search_courses | Buscar los cursos visibles por ciclo durante la vinculación SPAI |
| mod_assign_get_assignments | Verificar el curso y obtener las tareas y sus identificadores |
| core_webservice_get_site_info | Verificar el ID del usuario del token y el build instalado |
| mod_assign_list_participants | Leer los IDs y estados de la tabla de participantes de la tarea; requiere alcance de lectura de la tabla de calificación |
| core_enrol_get_enrolled_users | Consultar participantes activos visibles |
| mod_assign_get_submissions | Identificar el estado y el intento de la entrega |
| mod_assign_get_participant | Leer la fecha ajustada de entrega de una persona en una tarea individual |
| mod_assign_get_user_flags | Leer la fecha de una prórroga individual confirmada |
| mod_assign_get_grades | Identificar la existencia de una calificación en el intento |

La API del piloto escucha exclusivamente en 127.0.0.1, sirve el build local y verifica la clave en cada consulta. El navegador recibe únicamente los datos de seguimiento y la respuesta indica que no debe almacenarse en caché. La demo estándar sigue disponible con `npm start` en su puerto habitual.

## Pruebas con datos ficticios

El lector se prueba con una prórroga vigente, una fecha ajustada por Moodle para el grupo y una consulta de prórroga denegada. En este último caso la fila conserva el estado **Sin entrega** y la fecha queda indeterminada. Angular y el recorrido de Edge comprueban los textos **En plazo** y **Atraso por confirmar**, un atraso inferior a 24 horas y la conservación del corte al volver al detalle.

`npm run test:moodle` verifica el lector y el acceso HTTP local. `npm test` incluye el recorrido del componente Angular. Con Microsoft Edge instalado, ejecuta `npm run build` y después `npm run test:moodle:ui` para probar en navegador el resumen, las dos listas, la conservación de la lectura, el acceso móvil y el manejo de errores. El navegador de pruebas dirige el tráfico del piloto a un servidor ficticio en un puerto local independiente. Estas pruebas usan fuentes sintéticas.

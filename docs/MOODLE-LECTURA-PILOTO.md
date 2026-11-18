# Piloto local de lectura Moodle

Sistemas puede consultar las actividades individuales del curso **4455 · 603. Fundamentos de Contabilidad 27-1**. La primera actividad seleccionada es la Unidad 1 (módulo 53765, tarea 22041). El selector obtiene las demás tareas de Moodle y conserva sus identificadores. Una discrepancia de curso o ciclo detiene la lectura. El catálogo institucional multicurso y el acceso de Coordinación y Dirección requieren una fase posterior.

## Arranque en Windows

Desde la raíz del proyecto, con Node 24, ejecuta cada línea en PowerShell:

```powershell
npm ci
npm run build
[System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\pilot.mjs --token-stdin
```

Abre **http://127.0.0.1:4380/reportes** en el mismo equipo, selecciona el perfil simulado **Sistemas** y pulsa **Abrir piloto local de lectura Moodle**. El perfil muestra el enlace, pero no concede acceso institucional. Introduce la **clave local** impresa en la terminal. Para detenerlo pulsa Ctrl+C. El token se introduce en el indicador oculto de PowerShell. La clave del navegador cambia al reiniciar el servidor. El piloto conserva las filas en memoria mientras se consulta la pantalla. Cerrar la consulta o recargar la página vuelve a pedir la clave.

## Comprobación funcional

1. Selecciona la Unidad 1 y compara la hora de lectura con la de tu consulta directa de Moodle. Las cifras se calculan desde las filas devueltas; Moodle puede cambiar entre lecturas.
2. Abre «Entregas pendientes de calificar» y «Sin entrega». Las listas calculables muestran nombres y matrículas, y la última modificación de la entrega cuando Moodle la informa. Cuando falte el alcance, el detalle de «Sin entrega» explica el motivo y omite la lista. Volver al resumen mantiene la misma lectura. «Actualizar lectura» consulta nuevamente.
3. Una respuesta de permisos insuficientes detiene el indicador de esa actividad. Las tareas grupales, sin envíos, con escala no numérica o con identidades ocultas requieren tratamiento específico.
4. «Estudiantes identificados en el curso» cuenta las matrículas TUP activas visibles por usuario o correo institucional. Las cuentas sin matrícula identificable se informan aparte. Para interpretar «Sin entrega» hace falta conocer además a quién le correspondía la tarea.
5. La calificación es la de la tarea y del intento vigente. El cero registrado cuenta. Un envío en borrador y un estado desconocido aparecen por separado. El piloto no clasifica vencimientos para 27-1. La hora mostrada corresponde a la finalización de varias lecturas de Moodle.

## Población y avance

Cada lectura relaciona curso, módulo, tarea y padrón activo. El cálculo admite un alcance confirmado de todo el curso o una lista completa de destinatarios identificados para esa actividad. En el segundo caso, los faltantes se calculan únicamente dentro de la lista. Una lista incompatible con el padrón o con los envíos observados deja el alcance pendiente. Cambiar de tarea o actualizar solicita un nuevo corte.

Con el mismo token, Node verifica el ID de la cuenta técnica mediante `core_webservice_get_site_info` y lo excluye del padrón académico y de la lista de la tarea. Cada lectura solicita `mod_assign_list_participants` con el ID de tarea, todos los grupos visibles (`groupid=0`), búsqueda vacía y sin límite de filas. Comprueba los IDs contra un cotejo independiente vigente y el estado de cada participante contra los envíos del intento más reciente. Una fila ausente, duplicada, inesperada o con estado incompleto deja **Sin entrega (No calculable)**, conservando los envíos y notas verificables. Si falla la identificación de la propia cuenta, el piloto informa el error de lectura.

En el código oficial de Moodle 4.5.5, el listado pasa por la visibilidad de grupos, la capacidad de entregar, la asignación de calificadores y los filtros de disponibilidad de sección y actividad aplicables a listas de usuarios. Algunas restricciones no se aplican a esas listas. Pedir todos los grupos visibles o recibir el número esperado de filas es insuficiente para acreditar que llegaron todos los destinatarios. La edición y configuración instaladas deben cotejarse con el token institucional. [Servicio de tareas](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/externallib.php) · [Participantes de la tarea](https://github.com/moodle/moodle/blob/v4.5.5/mod/assign/locallib.php) · [Filtros de sección](https://github.com/moodle/moodle/blob/v4.5.5/availability/classes/info_module.php) · [Condiciones aplicables a listas](https://github.com/moodle/moodle/blob/v4.5.5/availability/classes/tree.php)

El avance divide las calificadas entre las calificadas más las pendientes del intento correspondiente. Si el denominador es cero y hay casos por revisar o falta confirmar la población, muestra **Avance por confirmar**. Una lectura completa de población confirmada sin envíos determinados ni casos por revisar muestra **Sin entregas**. Ambos estados omiten la barra y el cociente. Los fallos en las consultas de envíos o notas detienen el resumen.

### Cotejo local de Sistemas para Unidad 1

1. Desde la raíz del proyecto, prueba el servicio con el token de la cuenta técnica. Este comando de PowerShell consulta la versión instalada, el catálogo y los participantes visibles. Imprime identificadores de actividad y conteos agregados. Puede ejecutarse mientras el servidor anterior sigue abierto.

   ```powershell
   [System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\pilot.mjs --token-stdin --comprobar-participantes 22041
   ```

   Si el servicio deniega `mod_assign_list_participants`, el administrador de Moodle puede revisar en **Administración del sitio → Servidor → Servicios web → Servicios externos** si el servicio del token incluye esa función de lectura. Verifica además que la cuenta técnica pueda ver la tabla de calificación de esa tarea y los grupos necesarios. Repite el mismo comando tras cualquier decisión de Sistemas. `core_webservice_get_site_info` aporta el ID de la cuenta del token y el build con los que se vincula el cotejo.

2. En la versión instalada revisa con Sistemas la configuración de la **sección y la actividad**, las restricciones por grupo o agrupamiento y las excepciones. En la tabla de calificación comprueba la visibilidad de todos los grupos y la asignación de calificadores con una vista autorizada que cubra el conjunto completo. Determina los IDs Moodle de **todos los estudiantes a quienes corresponde la tarea**, incluidos quienes ya entregaron. Puedes obtener cada ID del enlace al perfil. Verifica por separado el ID de la cuenta técnica desde su perfil. Si no puedes establecer la población por identidad de forma independiente de la consulta REST, conserva «No calculable».

   **Cuando Sistemas ha comprobado que la tarea corresponde a todo el curso**, se puede preparar el cotejo automáticamente. Desde PowerShell en esta carpeta, el siguiente comando pide el ID de tarea, el total académico comprobado independientemente y el límite de vigencia. Se usa la fecha y zona que indique el operador. Node cruza cada ID activo con los participantes y el estado de su último envío, excluye la cuenta técnica y solo guarda el archivo si la comprobación completa pasa.

   ```powershell
   $tarea = Read-Host 'ID de tarea'; $total = Read-Host 'Estudiantes activos que deben entregar'; $hasta = Read-Host 'Vigente hasta (ISO con zona)'; [System.Net.NetworkCredential]::new('', (Read-Host 'Token de Moodle' -AsSecureString)).Password | node .\scripts\moodle\cotejar-curso.mjs $tarea $total $hasta
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

## Servicio web

El token queda en el proceso Node. El destino de las peticiones REST y el curso están fijados en el servidor. La clave local permite exclusivamente estas consultas. La tabla indica las funciones que debe autorizar el servicio web, con un alcance efectivo de lectura de toda la población del curso.

| Función | Uso |
| --- | --- |
| mod_assign_get_assignments | Verificar el curso y obtener las tareas y sus identificadores |
| core_webservice_get_site_info | Verificar el ID del usuario del token y el build instalado |
| mod_assign_list_participants | Leer los IDs y estados de la tabla de participantes de la tarea; requiere alcance de lectura de la tabla de calificación |
| core_enrol_get_enrolled_users | Consultar participantes activos visibles |
| mod_assign_get_submissions | Identificar el estado y el intento de la entrega |
| mod_assign_get_grades | Identificar la existencia de una calificación en el intento |

La API del piloto escucha exclusivamente en 127.0.0.1, sirve el build local y verifica la clave en cada consulta. El navegador recibe únicamente los datos de seguimiento y la respuesta indica que no debe almacenarse en caché. La demo estándar sigue disponible con `npm start` en su puerto habitual.

## Pruebas con datos ficticios

`npm run test:moodle` verifica el lector y el acceso HTTP local. `npm test` incluye el recorrido del componente Angular. Con Microsoft Edge instalado, ejecuta `npm run build` y después `npm run test:moodle:ui` para probar en navegador el resumen, las dos listas, la conservación de la lectura, el acceso móvil y el manejo de errores. El navegador de pruebas dirige el tráfico del piloto a un servidor ficticio en un puerto local independiente. Estas pruebas usan fuentes sintéticas.

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

Las cuatro funciones del servicio actual carecen de una lista acreditada de destinatarios. En la conexión institucional el piloto muestra **Población de la actividad por confirmar** y **Sin entrega (No calculable)**. Mantiene los envíos y las notas observados. Los escenarios de población confirmada utilizan una fuente ficticia en las pruebas. La visibilidad para la cuenta técnica, el modo de grupos y la ausencia de un campo de restricciones son insuficientes para declarar alcance de curso completo.

El avance divide las calificadas entre las calificadas más las pendientes del intento correspondiente. Si el denominador es cero y hay casos por revisar o falta confirmar la población, muestra **Avance por confirmar**. Una lectura completa de población confirmada sin envíos determinados ni casos por revisar muestra **Sin entregas**. Ambos estados omiten la barra y el cociente. Los fallos en las consultas de envíos o notas detienen el resumen.

### Cotejo pendiente de Sistemas para Unidad 1

1. Inicia el servidor con la entrada oculta indicada arriba. Abre Reportes → piloto → Unidad 1 y anota en local la hora del corte y los identificadores de curso, módulo y tarea.
2. En Moodle, abre la sección y la tarea del mismo curso. Revisa las restricciones de ambas, grupos, agrupamientos y excepciones aplicables. En la tabla de calificación consulta todos los grupos que la cuenta ya pueda ver y quita los filtros de estado. Contrasta participantes activos con permiso de entregar y las restricciones efectivas.
3. Compara las entregas del intento vigente, incluidas las calificadas con cero, y la lista de pendientes. Con el servicio actual el detalle de «Sin entrega» debe indicar por qué no se calcula. Registra únicamente fecha, alcance comprobado y conteos agregados. Los nombres, matrículas, capturas institucionales y token permanecen en el equipo.
4. Para automatizar esa comprobación, Sistemas debe identificar qué fuente de solo lectura ya autorizada certifica la población completa por tarea. Por ejemplo, `mod_assign_list_participants` ofrece la lista de la tabla de calificación por tarea y grupo. Su alcance depende de los grupos visibles y de la configuración de calificación. Antes de usarla habría que verificar cobertura de grupos, restricciones efectivas de sección y actividad, y reglas de asignación de calificadores. El piloto actual no invoca esa función ni solicita permisos adicionales. [Implementación de Moodle](https://github.com/moodle/moodle/blob/MOODLE_405_STABLE/mod/assign/externallib.php)

## Servicio web

El token queda en el proceso Node. El destino de las peticiones REST y el curso están fijados en el servidor. La clave local permite exclusivamente estas consultas. La tabla indica las funciones que debe autorizar el servicio web, con un alcance efectivo de lectura de toda la población del curso.

| Función | Uso |
| --- | --- |
| mod_assign_get_assignments | Verificar el curso y obtener las tareas y sus identificadores |
| core_enrol_get_enrolled_users | Consultar participantes activos visibles |
| mod_assign_get_submissions | Identificar el estado y el intento de la entrega |
| mod_assign_get_grades | Identificar la existencia de una calificación en el intento |

La API del piloto escucha exclusivamente en 127.0.0.1, sirve el build local y verifica la clave en cada consulta. El navegador recibe únicamente los datos de seguimiento y la respuesta indica que no debe almacenarse en caché. La demo estándar sigue disponible con `npm start` en su puerto habitual.

## Pruebas con datos ficticios

`npm run test:moodle` verifica el lector y el acceso HTTP local. `npm test` incluye el recorrido del componente Angular. Con el puerto 4380 libre y Microsoft Edge instalado, ejecuta `npm run build` y después `npm run test:moodle:ui` para probar en navegador el resumen, las dos listas, la conservación de la lectura, el acceso móvil y el manejo de errores. Estas pruebas usan fuentes sintéticas.

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
2. Abre «Entregas pendientes de calificar» y «Sin entrega». Cada lista muestra nombres y matrículas, y la última modificación de la entrega cuando Moodle la informa. Volver al resumen mantiene la misma lectura. «Actualizar lectura» consulta nuevamente.
3. Una respuesta de permisos insuficientes detiene el indicador de esa actividad. Las tareas grupales, sin envíos, con escala no numérica o con identidades ocultas requieren tratamiento específico.
4. La población corresponde a los participantes activos visibles con matrícula TUP identificable por usuario o correo institucional. El resumen informa aparte cuántas cuentas quedaron fuera del patrón. Verificar con la cuenta de Sistemas que el alcance incluya todos los grupos del curso. La asignación institucional y el grupo de origen requieren cotejo con Saeko–SPAI.
5. La calificación es la de la tarea y del intento vigente. El cero registrado cuenta. Un envío en borrador y un estado desconocido aparecen por separado. El piloto no clasifica vencimientos para 27-1. La hora mostrada corresponde a la finalización de varias lecturas de Moodle.

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

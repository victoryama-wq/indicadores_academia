# Alcance y revisión previa

Primera demo exclusivamente local. Fuente funcional: `../Requerimientos_Indicadores_Academia_v0_5.docx`; prevalece el prompt de esta entrega sobre los ejemplos y funciones futuras de v0.5. No existe dependencia del sistema Indicadores en producción. No se encontraron instrucciones AGENTS.md en los directorios ascendentes; se aplica el generado por Angular CLI en esta aplicación.

| Referencia Stitch (carpeta) | Aplicación |
| --- | --- |
| inicio_tablero_de_academia | Inicio: filtros, tarjetas, desglose y acceso al grupo |
| academic_monitoring_supervision_portal | Variante HTML del mismo Inicio; no pantalla adicional |
| grupo_enf_301_enfermer_a | Grupo y tabla de asignaturas/docentes |
| asignatura_enf_304_enfermer_a_cl_nica | Impartición de Enfermería Clínica y actividades |
| actividad_plan_de_cuidados_enf_304 | Resumen de actividad y cifras seleccionables |
| detalle_de_estudiantes_y_exportaci_n_enf_304 | Listado dentro de actividad y diálogo de vista previa |

## Diferencias resueltas antes de implementar

- ENF-301 es el grupo; ENF-304 es la clave visible de asignatura, nunca el identificador de la impartición. Las rutas usan g01, i01, a01 y r001…r030.
- Inicio combina 184 estudiantes/1420 registros con un filtro de un solo grupo. Grupo declara 6 materias y 180 registros, pero la asignatura amplía a 5 actividades/150 registros. Se acota toda esta demo a una impartición y una actividad; no se copian esos totales incompatibles.
- El ejemplo funcional v0.5 de cinco asignaturas y 150 registros corresponde a una validación futura. El conjunto solicitado aquí contiene 30 personas, 30 pares estudiante-actividad, 24 entregas, 18 calificadas, 6 pendientes (4 vencidos/2 en plazo) y 6 sin entrega.
- Stitch afirma plazo reglamentario de cinco días, artículos, recordatorios y notificaciones. D01 sigue abierto: los estados y fechas de esta demo se precargan, sin motor de reglas ni mensajes.
- La vista de estudiantes muestra 60% para 18/30 y otras vistas 75% para 18/24. Se explicita el denominador: entrega 24/30, calificación de entregas 18/24. Son proporciones descriptivas del conjunto ficticio, no fórmulas institucionales aprobadas.
- Se eliminan falsas afirmaciones de conexión Moodle, token válido, hash certificado y auditoría oficial. La cobertura se refiere únicamente a datos simulados.
- Administración e integración aparecen indebidamente en Coordinación en Stitch. Se muestran solo para Sistemas y como Próximamente. Dirección consulta, con exportación pendiente de D08; Coordinación y Sistemas pueden abrir una vista previa sin descarga.
- Los periodos 2024-1 y cortes de octubre de Stitch son inconsistentes entre sí. Se usa periodo de demostración 27-1 (sep-dic 2026), corte fijo 6 nov 2026 23:59 America/Cancun. Otro periodo sin datos y un corte incompleto permiten comprobar estados distintos.
- No hay diseño independiente de ficha individual, listado de grupos, errores ni vistas móviles. Se construyen con el mismo tema, tarjetas, etiquetas y navegación. No se cargan nombres, fotografías o correos tomados del diseño como si fueran personas reales.

## Decisiones visuales

Azul institucional #003178, navegación #213145, fondo #f8f9ff y acento violeta #550083. Tipografía Inter servida localmente. Angular Material para controles, tablas, paginación, panel de filtros y diálogos; Tailwind para rejillas y espaciado. Móvil: menú plegable, filtros expansibles y filas convertidas a fichas legibles. El corte y grupo permanecen en el encabezado de contexto.

## Referencias técnicas consultadas

- https://angular.dev/guide/routing/define-routes
- https://material.angular.dev/guide/theming
- https://tailwindcss.com/docs/installation/framework-guides/angular

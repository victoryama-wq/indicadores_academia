\---

name: angular-tailwind-ui-refactor

description: Mejorar interfaces existentes en proyectos Angular con Tailwind CSS, Angular Material o componentes propios. Usar cuando el usuario pida modernizar pantallas Angular, templates, formularios, dashboards, tablas, navegación, componentes standalone, Material components, Signals, estados visuales o responsive design sin alterar lógica de negocio.

\---



\# Skill: Angular Tailwind UI Refactor



\## Objetivo



Refactoriza interfaces Angular existentes para que sean limpias, minimalistas, responsivas, accesibles y mantenibles.



Usa prácticas modernas de Angular. Si está disponible, apóyate en la skill oficial `angular-developer`.



\## Reglas Angular



1\. Identifica si el proyecto usa standalone components o NgModules.

2\. No cambies arquitectura sin necesidad.

3\. No cambies rutas, servicios, guards ni modelos si la tarea es visual.

4\. No metas lógica compleja en el template.

5\. Usa control flow moderno si el proyecto ya lo utiliza.

6\. Si el proyecto usa Signals, respeta el patrón.

7\. Si usa RxJS, no sustituyas flujos reactivos sin razón.

8\. Si usa Angular Material, respeta sus componentes.

9\. Si usa Tailwind, prioriza clases Tailwind antes que CSS global.

10\. Mantén TypeScript mínimo en cambios de UI.



\## Angular Material



Si existe Angular Material:



\- Usa `mat-card`, `mat-form-field`, `mat-button`, `mat-icon`, `mat-table`, `mat-dialog` solo si ya están en uso.

\- No mezcles estilos agresivos sobre Material.

\- Mantén accesibilidad nativa de componentes.

\- Mejora espaciado, jerarquía y layout con Tailwind alrededor de Material.

\- Evita wrappers innecesarios.



\## Tailwind en Angular



Usa clases claras:



\- Contenedor: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

\- Sección: `rounded-2xl border border-slate-200 bg-white shadow-sm`.

\- Header: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.

\- Cards: `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`.

\- Botón primario: `inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium`.

\- Grid: `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4`.



No uses valores arbitrarios salvo que el diseño lo exija.



\## Formularios Angular



Para Reactive Forms o Template Forms:



1\. Mantén las validaciones existentes.

2\. No cambies nombres de controles.

3\. Añade labels claros.

4\. Muestra errores de forma limpia.

5\. Agrupa campos en secciones.

6\. Usa grid responsive.

7\. Coloca acciones al final.

8\. Botón principal visible.

9\. Botón secundario menos dominante.

10\. Mensajes de éxito/error legibles.



\## Tablas Angular



Para tablas:



1\. Agrega `overflow-x-auto`.

2\. No elimines columnas sin instrucción.

3\. Mejora padding y alineación.

4\. Agrega estado vacío.

5\. Mantén acciones claras.

6\. Evita iconos sin texto en acciones críticas.

7\. Si hay filtros, colócalos arriba con jerarquía clara.

8\. En móvil, permite scroll horizontal.



\## Dashboards Angular



Para dashboards:



1\. Métricas principales en cards.

2\. Acciones frecuentes visibles.

3\. Contenido secundario debajo.

4\. Usa grid responsive.

5\. Evita saturación.

6\. Usa iconos solo si ya existe librería.

7\. Añade skeleton/loading si ya hay estado de carga.

8\. Añade empty state si no hay datos.



\## Iconos



Orden de preferencia:



1\. `mat-icon` si Angular Material ya está instalado.

2\. `lucide-angular` si ya existe.

3\. SVG inline simple si no hay librería.

4\. No instalar librerías nuevas sin autorización.



\## Accesibilidad



Asegura:



\- `aria-label` en botones solo con icono.

\- `type="button"` cuando un botón no envía formulario.

\- `label` o `aria-label` en inputs.

\- `focus-visible`.

\- Texto descriptivo en errores.

\- Contraste suficiente.

\- No usar `div` clickeable para acciones.



\## Entrega



Antes de finalizar:



1\. Ejecuta o recomienda `npm run build`.

2\. Ejecuta o recomienda `ng test` si aplica.

3\. Revisa imports.

4\. Revisa responsive.

5\. Resume archivos modificados.



No agregues dependencias sin aprobación.


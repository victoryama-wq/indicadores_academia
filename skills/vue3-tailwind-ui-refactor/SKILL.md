\---

name: vue3-tailwind-ui-refactor

description: Mejorar interfaces existentes en proyectos Vue 3 con Tailwind CSS, Pinia y Vite. Usar cuando el usuario pida modernizar componentes Vue, dashboards, formularios, tablas, layouts, navegación, estados visuales, responsive design, Composition API, Pinia o componentes accesibles sin romper lógica existente.

\---



\# Skill: Vue 3 Tailwind UI Refactor



\## Objetivo



Mejora interfaces Vue 3 existentes con diseño limpio, minimalista, responsivo, accesible y fácil de mantener.



No migres arquitectura sin instrucción. No cambies lógica de negocio si la tarea es visual.



\## Reglas Vue 3



1\. Usa Composition API si el proyecto ya la utiliza.

2\. Prefiere `<script setup>` si el proyecto lo usa.

3\. No mezcles lógica de negocio con lógica visual.

4\. Mantén props y emits claros.

5\. No cambies stores Pinia sin necesidad.

6\. No modifiques rutas salvo instrucción explícita.

7\. No agregues librerías nuevas sin autorización.

8\. Respeta patrones actuales del proyecto.

9\. Extrae componentes solo si reduce duplicación real.

10\. Mantén nombres de componentes en PascalCase.



\## Pinia



Si hay Pinia:



\- No conviertas estado local en global sin necesidad.

\- No muevas datos al store solo por diseño.

\- Usa getters/actions existentes.

\- No cambies nombres de stores.

\- No cambies contratos de datos.

\- Si una pantalla tiene muchos estados visuales, organiza computed properties locales.



\## Vite



Si el cambio requiere optimización:



\- Revisa imports pesados.

\- Evita importar librerías completas si se puede importar por componente.

\- No cambies configuración Vite sin necesidad.

\- No agregues plugins sin justificación.

\- Mantén build simple.



\## Tailwind en Vue



Usa Tailwind de forma directa cuando el template siga siendo legible.



Patrones:



\- Contenedor: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

\- Card: `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`.

\- Header: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.

\- Grid: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`.

\- Tabla: `overflow-x-auto rounded-2xl border border-slate-200 bg-white`.

\- Estado vacío: `rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center`.



\## Componentes



Cuando un componente esté saturado:



1\. Separa header, contenido principal y acciones.

2\. Extrae cards reutilizables si hay repetición.

3\. Mantén props simples.

4\. No crees abstracciones prematuras.

5\. Conserva nombres claros.

6\. Evita componentes genéricos difíciles de entender.



\## Formularios Vue



1\. Mantén `v-model` existente.

2\. No cambies validaciones.

3\. Añade labels visibles.

4\. Agrupa campos.

5\. Usa grid responsive.

6\. Muestra errores cerca del campo.

7\. Botón principal claro.

8\. Botón secundario discreto.

9\. Deshabilita botón durante carga si existe estado.

10\. Añade feedback de éxito/error si ya existe lógica.



\## Tablas Vue



1\. Usa `overflow-x-auto`.

2\. Conserva columnas.

3\. Mejora encabezados.

4\. Agrega estado vacío.

5\. Mantén acciones visibles.

6\. Evita iconos sin texto en acciones críticas.

7\. Si hay filtros, ordénalos arriba.

8\. Mantén keys estables en `v-for`.



\## Iconos



Orden de preferencia:



1\. `lucide-vue-next` si existe.

2\. `@heroicons/vue` si existe.

3\. SVG inline simple si no hay librería.

4\. No instalar librerías nuevas sin autorización.



Reglas:



\- Iconos decorativos con `aria-hidden="true"`.

\- Botones con solo icono deben llevar `aria-label`.

\- Tamaños consistentes: `w-4 h-4`, `w-5 h-5`, `w-6 h-6`.



\## Accesibilidad



Asegura:



\- Elementos semánticos.

\- Labels en formularios.

\- Focus visible.

\- Contraste suficiente.

\- Botones reales.

\- Enlaces reales para navegación.

\- Textos alternativos adecuados.

\- No depender solo del color.



\## Entrega



Al terminar:



1\. Resume cambios.

2\. Lista archivos modificados.

3\. Explica mejoras visuales.

4\. Indica si no se tocó lógica de negocio.

5\. Recomienda `npm run build` o `npm run dev` si aplica.


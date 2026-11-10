\---

name: ui-clean-refactor

description: Mejorar interfaces existentes de Web Apps con diseño limpio, minimalista, responsivo, accesible y fácil de mantener. Usar cuando el usuario pida modernizar, limpiar, rediseñar o hacer más usable una pantalla, dashboard, formulario, tabla, navegación, login, modal, card o layout existente sin cambiar la lógica de negocio.

\---



\# Skill: UI Clean Refactor



\## Objetivo



Mejora interfaces existentes sin romper funcionalidad. Prioriza diseño limpio, minimalista, responsivo, accesible y fácil de entender por usuarios no técnicos.



No reinventes el proyecto. Refactoriza la UI actual respetando estructura, rutas, servicios, datos, estados y lógica existente.



\## Prioridades



1\. Mejorar claridad visual.

2\. Reducir ruido.

3\. Ordenar jerarquía de información.

4\. Hacer que la interfaz sea más fácil de usar.

5\. Mejorar responsive.

6\. Mejorar accesibilidad básica.

7\. Conservar lógica de negocio.

8\. Evitar dependencias innecesarias.

9\. Mantener código legible.

10\. Entregar cambios aplicables.



\## Estilo visual base



Usa una estética sobria y profesional:



\- Fondos: `bg-slate-50`, `bg-gray-50`, `bg-white`.

\- Texto principal: `text-slate-900`, `text-gray-900`.

\- Texto secundario: `text-slate-500`, `text-gray-500`.

\- Bordes: `border border-slate-200`.

\- Cards: `rounded-2xl`, `shadow-sm`, `bg-white`.

\- Espaciado: `p-4`, `p-6`, `gap-4`, `gap-6`.

\- Contenedores: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

\- Layouts: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.



Evita saturación, gradientes excesivos, sombras pesadas, colores chillantes, animaciones innecesarias o interfaces genéricas.



\## Regla principal



Si la tarea es mejorar diseño, modifica solo:



\- HTML/template.

\- Clases CSS/Tailwind.

\- Estructura visual.

\- Componentes visuales.

\- Estados de UI.

\- Accesibilidad.

\- Responsive.



No modifiques:



\- Servicios.

\- Guards.

\- Rutas.

\- Modelos.

\- Interfaces de datos.

\- APIs.

\- Reglas de negocio.

\- Autenticación.

\- Validaciones funcionales ya existentes.



\## Flujo de trabajo



Antes de editar:



1\. Identifica framework: Angular, Vue, React u otro.

2\. Revisa si existe Tailwind.

3\. Revisa si hay Angular Material, PrimeNG, Element Plus, Headless UI, Reka UI u otra librería.

4\. Revisa si existe librería de iconos.

5\. Revisa patrones visuales actuales.

6\. Detecta duplicación visual.



Durante la edición:



1\. Conserva contenido y funcionalidad.

2\. Mejora estructura visual con secciones claras.

3\. Agrupa información en cards o bloques.

4\. Mejora espaciado y jerarquía.

5\. Añade estados hover/focus/disabled cuando aplique.

6\. Asegura que funcione en móvil, tablet y escritorio.

7\. Usa iconos solo si ya hay librería instalada o si se autoriza.

8\. Evita dependencias nuevas salvo instrucción explícita.



Después de editar:



1\. Verifica compilación.

2\. Revisa imports innecesarios.

3\. Revisa responsive.

4\. Revisa accesibilidad básica.

5\. Resume cambios.



\## Patrones recomendados



\### Dashboard



Debe tener:



\- Encabezado claro.

\- Métricas en cards.

\- Acciones rápidas.

\- Tabla o lista responsiva.

\- Estado vacío.

\- Estado de carga si aplica.

\- Jerarquía visual clara.



\### Formulario



Debe tener:



\- Título claro.

\- Descripción breve.

\- Campos agrupados.

\- Labels visibles.

\- Ayuda o error por campo.

\- Botones bien jerarquizados.

\- Una columna en móvil.

\- Dos columnas desde `md` si hay muchos campos.



\### Tabla



Debe tener:



\- Contenedor `overflow-x-auto`.

\- Encabezados claros.

\- Padding cómodo.

\- Acciones visibles.

\- Estado vacío.

\- Texto secundario para metadatos.

\- Evitar columnas comprimidas en móvil.



\### Login



Debe tener:



\- Card centrada.

\- Nombre o logo del sistema.

\- Campos claros.

\- Botón principal evidente.

\- Mensajes de error legibles.

\- Diseño sobrio.



\### Navegación



Debe tener:



\- Estado activo.

\- Iconos consistentes si existen.

\- Texto legible.

\- Comportamiento móvil claro.

\- No ocultar acciones críticas.



\## Accesibilidad mínima



Asegura:



\- Uso correcto de `button`, `a`, `form`, `label`, `main`, `section`, `nav`.

\- Foco visible.

\- Contraste suficiente.

\- Inputs con label.

\- Botones con texto claro.

\- Iconos decorativos con `aria-hidden="true"`.

\- Iconos funcionales con texto o `aria-label`.

\- Mensajes de error asociados al campo.

\- No depender solo del color para comunicar estados.



\## Entrega final



Al terminar, responde con:



1\. Qué se mejoró.

2\. Archivos modificados.

3\. Cambios visuales principales.

4\. Notas técnicas.

5\. Comandos de verificación si aplican.



No des explicación larga si el usuario pidió implementación directa.


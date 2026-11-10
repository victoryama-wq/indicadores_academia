\---

name: a11y-responsive-icons

description: Revisar y mejorar accesibilidad, responsive design e iconografía en interfaces existentes. Usar cuando el usuario pida mejorar usabilidad, navegación móvil, contraste, labels, foco visible, botones, tablas responsivas, iconos, SVG, Lucide, Heroicons, Angular Material icons o accesibilidad WCAG/WAI.

\---



\# Skill: A11y Responsive Icons



\## Objetivo



Mejora accesibilidad, responsive design e iconografía en interfaces existentes sin alterar lógica de negocio.



Aplica criterios prácticos basados en WAI/WCAG: perceptible, operable, comprensible y robusto.



\## Accesibilidad obligatoria



Revisa y mejora:



1\. Contraste de texto.

2\. Labels visibles.

3\. Foco visible.

4\. Navegación por teclado.

5\. Estructura semántica.

6\. Botones con propósito claro.

7\. Enlaces distinguibles.

8\. Estados de error.

9\. Mensajes de ayuda.

10\. Textos alternativos.

11\. Uso correcto de ARIA.

12\. Evitar divs clickeables.



\## Reglas ARIA



1\. No uses ARIA si HTML semántico resuelve el problema.

2\. Usa `aria-label` solo cuando no haya texto visible.

3\. Usa `aria-hidden="true"` en iconos decorativos.

4\. No ocultes texto necesario para lectores de pantalla.

5\. No agregues roles incorrectos.

6\. Mantén botones como `button`.

7\. Mantén enlaces como `a`.

8\. Usa `aria-describedby` para ayudas o errores cuando aplique.



\## Responsive design



Valida mentalmente estos anchos:



\- 320px.

\- 375px.

\- 640px.

\- 768px.

\- 1024px.

\- 1280px.



Reglas:



1\. Mobile-first.

2\. Evitar anchos fijos.

3\. Usar `w-full` en móvil.

4\. Usar `max-w-\*` para contenedores.

5\. Formularios en una columna en móvil.

6\. Cards apiladas en móvil.

7\. Tablas con `overflow-x-auto`.

8\. Botones con tamaño táctil suficiente.

9\. Evitar textos comprimidos.

10\. No ocultar información crítica en móvil.



\## Iconografía



Antes de agregar iconos, revisa dependencias.



Orden de preferencia:



1\. Lucide si ya existe.

2\. Heroicons si ya existe.

3\. Angular Material icons si el proyecto usa Angular Material.

4\. SVG inline simple si no hay librería.

5\. No instalar librerías nuevas sin autorización.



Reglas:



\- Tamaño estándar: `w-4 h-4`, `w-5 h-5`, `w-6 h-6`.

\- Stroke consistente.

\- No mezclar múltiples estilos sin razón.

\- Iconos decorativos: `aria-hidden="true"`.

\- Botones solo con icono: `aria-label`.

\- Acciones críticas deben tener texto visible.

\- No usar iconos ambiguos sin etiqueta.



\## Estados visuales



Asegura:



1\. Hover.

2\. Focus.

3\. Active.

4\. Disabled.

5\. Loading.

6\. Empty state.

7\. Error state.

8\. Success state.



\## Checklist para tablas



1\. Tabla dentro de `overflow-x-auto`.

2\. Encabezados claros.

3\. Acciones legibles.

4\. Estados vacíos.

5\. No comprimir columnas en móvil.

6\. Texto secundario para detalles.

7\. Botones accesibles.



\## Checklist para formularios



1\. Cada input tiene label.

2\. Errores cerca del campo.

3\. Mensaje de ayuda cuando aplique.

4\. Orden lógico de tabulación.

5\. Botón submit claro.

6\. Botón cancelar secundario.

7\. Estados disabled/loading.

8\. Validación visual y textual.



\## Entrega



Al terminar, reporta:



1\. Problemas detectados.

2\. Mejoras aplicadas.

3\. Riesgos pendientes.

4\. Archivos modificados.

5\. Recomendaciones mínimas de prueba manual.


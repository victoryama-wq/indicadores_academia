# Aplicación de skills de UI y Angular

10 de noviembre de 2026. Refactor visual de la misma demo local de Indicadores de Academia.

## Skills aplicadas e instalación

| Skill | Aplicación |
| --- | --- |
| [a11y-responsive-icons](../skills/a11y-responsive-icons/SKILL.md) | Etiquetas visibles, foco, teclado, iconos decorativos, tablas y anchos de pantalla. |
| [angular-tailwind-ui-refactor](../skills/angular-tailwind-ui-refactor/SKILL.md) | Material existente, rejillas Tailwind, imports standalone y cambios limitados a componentes de UI. |
| [ui-clean-refactor](../skills/ui-clean-refactor/SKILL.md) | Jerarquía, legibilidad, menor ruido visual y conservación del recorrido. |
| [angular-developer](../.agents/skills/angular-developer/SKILL.md) | Referencias de componentes, estilos, Tailwind 4, consultas de vista con signals y pruebas E2E. |

Se ejecutó la instalación solicitada desde [angular/skills](https://github.com/angular/skills), limitada al proyecto y a Codex:

```powershell
npx --yes skills add https://github.com/angular/skills --agent codex --skill angular-developer angular-new-app --yes --copy
```

Ambas skills quedaron en `.agents/skills/`; `skills-lock.json` registra procedencia y hashes. `npx skills list --agent codex` confirma su instalación. Estarán disponibles para descubrimiento en el próximo turno; en este turno se leyeron directamente sus archivos. `angular-new-app` se revisó, pero su flujo de creación no corresponde a una aplicación existente. No se recreó la demo ni se aplicaron indicaciones exclusivas de Angular 22: se conserva Angular 21.2.26. Las skills locales proporcionadas no se reescribieron.

## Hallazgos y cambios

- Los símbolos de texto de la navegación y las acciones tenían trazos y tamaños dispares. Se sustituyeron por un componente `UiIcon`, con `MatIcon` y SVG locales de trazo consistente. Los iconos decorativos están ocultos a tecnologías de asistencia y no descargan fuentes ni recursos remotos.
- El contexto del corte, estados, ayudas y metadatos usaban tamaños de 9–11 px. Se elevaron a 12 px y se conservaron cifras destacadas, colores institucionales y estados con texto. Se simplificó el fondo de la llamada principal y se aumentó la altura de botones de texto, contorno y relleno a 44 px mediante tokens públicos de Material.
- Las tarjetas tenían una barra idéntica del 65% sin relación con sus valores. Se retiró ese adorno; las cifras y los porcentajes calculados de entrega/calificación permanecen intactos. Las rejillas se expresan con utilidades Tailwind.
- Se añadió una etiqueta visible «Perfil simulado». El campo usa contorno porque la densidad compacta ocultaba la etiqueta de la variante rellena. El buscador muestra «Buscar estudiante o matrícula» como etiqueta real, y su evento lee una referencia del input sin `$any`.
- Se añadieron rutas de navegación semánticas, estados `aria-current`, botones `type="button"`, enlaces de contexto subrayados y nombres accesibles que conservan el texto visible. Las acciones «Ver ficha» incluyen el nombre ficticio mediante texto solo para lectores de pantalla.
- Las tablas conservan todas las columnas, encabezados con `scope="col"` y su presentación de fichas en móvil. Los encabezados secundarios se ocultan solo visualmente; siguen disponibles para lectores de pantalla. Un contenedor enfocable limita cualquier desplazamiento horizontal a la tabla. Primera y última página vuelven a estar visibles en móvil.
- El menú móvil mantiene el foco dentro al abrirse, lo devuelve al botón al cerrar o navegar y libera el contenido al cambiar a escritorio. Se usa `viewChild` con `read: ElementRef` para el botón Material y `afterNextRender` para enfocar después de retirar `inert`. Se impide desplazar el fondo mientras está abierto.
- Se limitó la detección de Tailwind a `src` para evitar generar CSS a partir de ejemplos de las skills instaladas. Se utilizó el mecanismo [`source()` de Tailwind 4](https://tailwindcss.com/docs/detecting-classes-in-source-files#setting-your-base-path).

## Archivos principales

- `src/app/app.ts`, `src/app/app.html`: navegación, foco e iconos del marco de la aplicación.
- `src/app/shared/ui-icon/ui-icon.ts`: componente visual nuevo, creado con la CLI.
- `src/app/shared/profile-selector/profile-selector.ts`, `context-filters/context-filters.ts`, `metrics/metrics.ts`, `record-list/record-list.html`, `record-list/record-list.ts`, `export-preview/export-preview.ts`: etiquetas, tarjetas, tablas, botones e imports.
- Componentes/templates de `features/home`, `groups`, `subjects`, `activities`, `followup` y `system`: iconos, semántica y contenedores de UI.
- `src/styles.scss`, `src/tailwind.css`: tema, tipografía, tamaños táctiles, responsive y detección de clases.
- `e2e/demo.spec.ts`: siete anchos y comprobaciones de foco, etiquetas, encabezados y paginación.
- `.agents/skills/`, `skills-lock.json`: skills oficiales instaladas y procedencia.

Se compararon hashes con una copia anterior al refactor: `src/app/core/*`, configuración, rutas, modelos, servicios, `package.json`, `package-lock.json` y presupuestos no cambiaron. No se agregaron dependencias a la aplicación. La instalación de la herramienta de skills se ejecutó mediante npx fuera del manifiesto de la app.

## Verificación y revisión manual

Resultados de compilación, pruebas, auditoría y capturas en [VERIFICACION.md](VERIFICACION.md). Las capturas anteriores de Inicio a 1440 y 320 px se conservaron en `evidencia/ui-antes/`; las capturas posteriores están en `evidencia/`.

La revisión automática no sustituye una sesión completa con lector de pantalla. Revisión manual mínima recomendada: recorrer con Tab/Shift+Tab y Escape; comprobar con NVDA la asociación de encabezados y celdas; revisar zoom de navegador al 200% y manejo táctil en un móvil real. Aceptación visual del propietario pendiente.

La demo mantiene datos ficticios, perfiles simulados y servicio en loopback. No hubo cambios funcionales, integración con Moodle/Firebase, publicación, commit ni push.

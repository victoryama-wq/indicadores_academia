# Instrucciones para trabajar en Indicadores de Academia

## Al iniciar una tarea

1. Lee el [README](README.md) y el [estado actual](docs/ESTADO-ACTUAL.md). Identifica el entregable solicitado, el último hito y la siguiente acción registrada.
2. En una copia local, consulta `git status --short --branch` y `git log -1 --oneline --decorate`. Comprueba el remoto y la rama de destino. Actualiza las referencias remotas con `git fetch` cuando esté disponible el remoto. Si trabajas directamente en GitHub, consulta la referencia y el PR de la rama allí.
3. Contrasta el registro con los PR abiertos, sus commits y las comprobaciones del SHA que vas a retomar. Conserva los cambios locales de otras tareas y reutiliza la rama correspondiente cuando exista. Si las fuentes discrepan, identifica la última evidencia fechada para cada entorno.
4. Abre la guía específica del área que vas a modificar. El [procedimiento de Firebase](docs/VISTA-FIREBASE.md) aplica cuando la tarea incluye publicación o recuperación.

## Al cerrar o pausar una tarea

1. Revisa el diff contra el alcance solicitado y comprueba los archivos pendientes. Ejecuta las verificaciones correspondientes al cambio. Registra qué pasó, qué falló y qué quedó pendiente, con el comando o enlace de CI del SHA comprobado.
2. Identifica dónde quedó el trabajo: copia local, rama y PR, o integración en `main`. Si queda en curso, anota la rama, el último commit disponible, cualquier cambio pendiente de guardar y el primer paso para continuar. Si es exclusivamente local, indica en qué copia se encuentra.
3. Actualiza el [estado actual](docs/ESTADO-ACTUAL.md) cuando cambie un hito, una decisión, un bloqueo, el despliegue o el siguiente paso. Enlaza el PR para seguir las comprobaciones y el merge posteriores al commit. Un cambio documental puede avanzar `main` mientras el SHA publicado sigue siendo el del último despliegue confirmado.
4. Para una publicación incluida en la tarea, registra la fecha y hora de Cancún, el SHA de la aplicación, los recursos publicados, su versión o revisión y el resultado del recorrido en el dominio. Distingue la comprobación técnica del visto bueno de Academia e identifica quién confirmó cada uno. Usa identificadores de revisión y datos de prueba en la evidencia. Mantén credenciales y archivos institucionales fuera del repositorio.
5. Actualiza el README si cambió el uso o arranque, esta guía si cambió el procedimiento y la documentación del módulo si cambió su contrato. Cierra con el resultado verificable, los enlaces y la siguiente acción con su responsable. Si la tarea fue de consulta y el proyecto sigue en el mismo punto, basta el resumen en la respuesta.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

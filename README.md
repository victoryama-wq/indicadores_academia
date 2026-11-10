# Indicadores de Academia · Tec Playa

Primera demo local, creada desde cero con Angular 21, TypeScript, Angular Material y Tailwind CSS 4. Datos ficticios en memoria y perfiles simulados. Proyecto independiente del sistema de seguimiento académico en producción.

## Ejecutar en Windows / PowerShell

Validado con Node.js 24.14.1 y npm 11.11.0. Se recomienda Node 24 LTS. No es necesario instalar Angular CLI globalmente para ejecutar el proyecto.

```powershell
cd C:\Users\Admin\Documents\Indicadores_Academia\indicadores-academia-demo
npm ci
npm start
```

Abrir http://127.0.0.1:4300/inicio. El servidor escucha solo en loopback y revisa cambios cada segundo para facilitar la recarga en Windows. Para detenerlo, Ctrl+C.

```powershell
npm run build
npm test
npm run test:dependencies
npm run test:e2e
```

Las pruebas E2E utilizan Microsoft Edge instalado (`channel: msedge`) y arrancan el servidor cuando es necesario. `npx playwright show-report` abre el reporte local. La compilación se genera en `dist/indicadores-academia-demo/browser`. Una futura configuración de alojamiento deberá resolver las rutas Angular hacia `index.html`; no se ha configurado ni publicado alojamiento.

## Integración continua

El workflow [CI](.github/workflows/ci.yml) ejecuta el trabajo **Validación Angular** en pull requests dirigidos a `main`, pushes a `main` y ejecución manual desde Actions (cuando el workflow esté en la rama predeterminada). Usa Ubuntu 24.04, Node 24.14.1, caché de npm basada en `package-lock.json` y permisos `contents: read`. Ejecuta, en pasos separados y en este orden: `npm ci`, `npm run build`, `npm test` y `npm run test:dependencies`. Valida instalación, compilación, datos ficticios y compatibilidad de dependencias, sin credenciales de Firebase ni Moodle.

El job independiente **E2E Edge** usa Ubuntu 24.04, Node 24.14.1 y caché por el mismo lockfile. Ejecuta `npm ci`, `npx playwright install --with-deps msedge` y `npm run test:e2e` en modo headless. Playwright inicia y espera su propio servidor local en CI; fuera de CI puede reutilizar uno existente. El recorrido comprueba seis pendientes (cuatro vencidos y dos en plazo) en siete anchos de pantalla. Los estados están precargados al corte ficticio y no dependen del día de ejecución.

El artefacto `playwright-edge` conserva `playwright-report/` y `test-results/` durante 7 días, también si fallan las pruebas (salvo cancelación de la ejecución). Incluye capturas del recorrido en el reporte HTML y trazas/capturas ante fallos; las capturas históricas de `docs/evidencia/` no se sobrescriben. Los fallos de pruebas hacen fallar el job. Ambos trabajos validan únicamente datos ficticios y servicios locales, sin acceso a Moodle ni Firebase de producción.

**Validación Angular** conserva su nombre y sigue siendo obligatoria para `main`. **E2E Edge** se evaluará como comprobación obligatoria después de demostrar su funcionamiento en GitHub. Este cambio no modifica el ruleset ni publica la demo.

## Recorrido

| Ruta | Resultado |
| --- | --- |
| `/inicio` | Periodo, corte, filtros, indicadores y acceso al grupo |
| `/grupos` | Grupos de la selección |
| `/grupos/g01` | ENF-301, asignatura y docente |
| `/asignaturas/i01` | Enfermería Clínica, clave visible ENF-304, actividad |
| `/actividades/a01` | Plan de cuidados, resumen y registros |
| `/actividades/a01?estado=pendiente` | Exactamente 6 pendientes: 4 vencidos y 2 en plazo |
| `/seguimiento/r019` | Ficha individual de un pendiente vencido |
| `/seguimiento/r023` | Ficha individual de un pendiente en plazo |
| `/seguimiento/r001` | Registro calificado con cero; no se trata como dato vacío |

Desde Inicio: **Ver grupos y asignaturas → Abrir asignatura → Abrir actividad → 6 pendientes de calificar → Ver ficha**. La selección de una cifra limpia la búsqueda de estudiantes para que el detalle explique exactamente esa cifra. La búsqueda, el orden y la página se recuperan al volver de la ficha.

Los parámetros `periodo`, `corte`, `carrera`, `modalidad`, `grupo`, `docente`, `tipo`, `unidad`, `estado`, `pagina`, `tamano` y `orden` conservan el contexto. Solo contienen identificadores de catálogos o valores de estado. El texto de búsqueda y el perfil se guardan en `sessionStorage`, nunca en la dirección. La recarga de un enlace no depende de `history.state`.

## Conjunto de demostración

ENF-301 → Licenciatura en Enfermería → Escolarizada → Enfermería Clínica → Plan de cuidados. Periodo de demostración 27-1, corte 6 de noviembre de 2026 a las 23:59, zona America/Cancun.

- 30 estudiantes distintos y 30 registros estudiante-actividad.
- 24 entregas recibidas = 18 calificadas + 6 pendientes.
- Los 6 pendientes = 4 vencidos + 2 en plazo.
- 6 registros sin entrega.
- Estados y fechas precargados, sin reglas institucionales ni cálculo de vencimientos por reloj actual.

Las proporciones 24/30 y 18/24 describen únicamente el conjunto ficticio; las fórmulas oficiales, plazos, prórrogas, reentregas y cortes quedan pendientes de Academia. Todos los nombres y matrículas son explícitamente ficticios.

## Perfiles y estados de prueba

El selector superior cambia entre Coordinación, Dirección y Sistemas. Coordinación consulta y abre una vista previa de exportación sin descarga. Dirección recorre las mismas consultas sin exportación (D08 pendiente). Sistemas añade un menú administrativo separado; sus pantallas son Próximamente. Acceder directamente a `/admin/catalogos` desde otros perfiles muestra Acceso restringido. Estas restricciones de demostración no son seguridad de servidor ni autenticación real.

En Inicio o Grupos, expandir **Filtros de consulta**:

- Modalidad Mixta, tipo Foro, Unidad 2 o periodo 27-2: lista vacía coherente, no otros datos.
- Corte 30 oct 2026: información incompleta, sin convertirla en cero o incumplimiento.
- Corte Simular error de consulta: error con reintento y regreso al corte de demostración.
- Carga: el adaptador emite con una breve demora y muestra progreso.
- Identificador inexistente: Recurso no disponible. Dirección desconocida: Página no encontrada.

## Estructura y contrato

- `src/app/core/models.ts`: entidades, contexto de consulta, estados e interfaz `AcademicDataSource` inyectada mediante `ACADEMIC_DATA`.
- `src/app/core/demo-data.ts`: único origen de estudiantes y registros ficticios. No importa SDK de Firebase ni usa API de Moodle.
- `src/app/core/query-store.ts`: consulta reactiva, cancelación al cambiar de contexto, carga y errores.
- `src/app/core/navigation-context.ts`: URL, contexto, perfil y búsqueda local.
- `src/app/features/`: Inicio, grupos, asignaturas, actividades, seguimiento y estados; componentes standalone con rutas de carga diferida.
- `src/app/shared/`: filtros Material, indicadores, tabla/paginación/orden, diálogo de vista previa.
- `src/styles.scss`: tema institucional común y adaptación responsiva; `src/tailwind.css`: Tailwind 4. Inter y recursos se sirven localmente.

Un adaptador Firebase posterior implementará el contrato y validará ámbito en servidor. Antes de ampliar el conjunto a varios grupos/actividades deberán incorporarse las reglas oficiales y consultas paginadas de backend. La demo pagina en memoria sus 30 registros.

## Referencias, verificación y siguientes etapas

La correspondencia de todos los diseños Stitch, sus discrepancias y los criterios de las vistas faltantes se documentan en [docs/REFERENCIAS.md](docs/REFERENCIAS.md). Las verificaciones de entrega están en [docs/VERIFICACION.md](docs/VERIFICACION.md); las capturas, en `docs/evidencia/`.

Los ajustes de dependencias transitivas, sus pruebas de compatibilidad y la reducción de carga inicial se explican en [docs/MANTENIMIENTO-DEPENDENCIAS.md](docs/MANTENIMIENTO-DEPENDENCIAS.md). Mantener los overrides bajo revisión al actualizar Angular CLI.

El refactor visual, las skills locales aplicadas y la instalación de `angular/skills` se documentan en [docs/REFACTOR-UI-SKILLS.md](docs/REFACTOR-UI-SKILLS.md). Incluye mejoras de accesibilidad, tablas móviles, iconografía local y evidencia de que los contratos y dependencias de la demo permanecen intactos.

Próximamente: seguimiento docente, reportes completos y descarga, históricos, calidad de información y formularios administrativos. Autenticación real, permisos de backend/Rules, Firebase, conexión Moodle de solo lectura y publicación pertenecen a otras etapas. La demo no se ha desplegado.

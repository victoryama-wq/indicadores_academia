# Verificación de la demo local y su mantenimiento

Fecha: 10 de noviembre de 2026. Entorno: Windows, Node 24.14.1, npm 11.11.0, Microsoft Edge mediante Playwright. Alcance: datos ficticios, loopback, sin servicios externos.

## Compilación y arranque

- `npm ci`: salida 0, instalación limpia desde el lockfile, sin avisos de dependencias obsoletas ni vulnerabilidades reportadas.
- `npm run build -- --stats-json`: salida 0, sin advertencias. Compilación Angular de producción generada correctamente. Salida conservada en `build-validation.log`.
- Paquete inicial después del refactor de UI: **468.91 kB**, transferencia estimada por Angular: **120.18 kB**, sin advertencias. Antes del refactor visual: 435.53 kB / 111.56 kB; entrega inicial: 654.12 kB / 153.18 kB. La iconografía Material añade código y el resultado continúa dentro del presupuesto de aviso de **500 kB**, que no cambió; tampoco cambió el límite de error de 1 MB. Las medidas corresponden al paquete inicial, no a todos los chunks diferidos ni a tiempos de carga de extremo a extremo. Los objetivos de rendimiento institucional siguen pendientes (D09).
- Servicio disponible en `http://127.0.0.1:4300/`; `/inicio` devuelve HTTP 200. Escucha solo en loopback. La revisión de mantenimiento se ejecutó con `ng serve --host 127.0.0.1 --port 4300 --poll=1000 --configuration production` (equivalente a `npm start -- --configuration production`), para comprobar la carga diferida con optimización. `npm start` conserva su configuración habitual de desarrollo.
- La recarga de archivos en Windows se configuró con polling de un segundo tras observar una edición TypeScript no reflejada por el watcher durante el desarrollo.

## Pruebas automatizadas

`npm test`: **3 pruebas aprobadas**, salida 0.

1. 30 personas distintas y 30 pares únicos estudiante-actividad; 24 entregas, 18 calificadas, 6 pendientes, 6 sin entrega; pendientes divididos en 4 vencidos y 2 en plazo. La nota cero permanece como calificación.
2. Separación de un corte incompleto y selecciones vacías por periodo/modalidad/tipo/unidad/grupo.
3. El error simulado no devuelve resultados de otro corte.

`npm run test:dependencies`: **4 pruebas aprobadas** en el mantenimiento de dependencias anterior, salida 0. Verifican descubrimiento de ejecutables, empaquetado/extracción con exclusiones, caché y patrones de rutas TUF usando el árbol real de dependencias de la CLI. El refactor visual no modifica el manifiesto ni el lockfile. Detalle en `MANTENIMIENTO-DEPENDENCIAS.md`.

`npm run test:e2e`: **12 escenarios aprobados**, salida 0. Las **55 revisiones Axe** (7 estados por cada uno de los 7 anchos, 4 menús móviles abiertos, selector de perfil abierto y navegación después de cambiar de móvil a escritorio) terminaron sin infracciones detectadas por sus reglas activas por defecto. Se comprobaron el cambio a Dirección con teclado, la etiqueta visible del perfil y la devolución del foco al selector.

- Recorrido Coordinación a **320, 375, 640, 768, 1024, 1280 y 1440 píxeles**: Inicio → grupo → asignatura → actividad/listado → ficha. Revisión Axe de pantallas, diálogo y menú móvil. Comprobación de que el ancho del documento no supera el viewport; encabezados de las cinco columnas y controles de primera/última página accesibles también en móvil. Sin errores de página en los siete recorridos.
- Selección de seis pendientes, seis filas, cuatro etiquetas Vencido y dos En plazo. Recarga de actividad y ficha, regreso con periodo/corte/modalidad intactos.
- Búsqueda, orden descendente y página recuperados al volver; búsqueda fuera de la URL; seleccionar una cifra limpia la búsqueda para recuperar su conjunto completo.
- Las cifras 30/24/18/6 abren los conjuntos correspondientes; ficha con calificación cero.
- Dirección consulta sin exportación ni menú administrativo; acceso directo a administración rechazado en la simulación; Sistemas muestra sus opciones Próximamente; cambio de perfil sale de administración.
- Filtros sin coincidencias, corte incompleto, error con recuperación, cuatro tipos de identificador inexistente y ruta desconocida.
- Vista previa con los seis registros filtrados, cancelación y devolución del foco al botón; apertura y cierre del menú móvil.
- Teclado: enlace de salto al contenido, foco inicial en cerrar menú, recorrido circular con Tab/Shift+Tab, cierre con Escape, retorno al botón después de navegar y liberación de `inert` al cambiar de 375 a 1280 px.

Las iteraciones previas detectaron contraste insuficiente en las migas de navegación, foco del contenido desplazable del diálogo, etiquetas accesibles de tarjetas y necesidad de un control explícito de cierre del menú móvil. Se corrigieron y se repitieron las comprobaciones afectadas. Una comparación de texto en la prueba de paginación también se corrigió para comparar `innerText` consistentemente.

En el mantenimiento de dependencias anterior hubo un intento de servidor de respaldo sobre el puerto ocupado; se verificó el listener y aquella revisión terminó con siete escenarios aprobados. La revisión visual posterior reutiliza el servidor optimizado existente.

El refactor visual añadió comprobaciones de foco que detectaron una referencia incorrecta al componente Material del botón del menú. Se corrigió mediante `read: ElementRef` y se verificó primero el recorrido de teclado. La inspección visual detectó también que Material ocultaba la etiqueta del perfil con la densidad compacta de la variante rellena: se cambió a contorno y se añadió una comprobación de visibilidad. El registro de decisiones, skills, archivos y revisión manual pendiente está en [REFACTOR-UI-SKILLS.md](REFACTOR-UI-SKILLS.md).

## Evidencia visual

Capturas completas en `docs/evidencia/`: `inicio-{ancho}.png` y `pendientes-{ancho}.png` para los siete anchos (14 capturas). Se inspeccionaron Inicio en escritorio y móvil y el listado en tableta, con etiqueta de perfil, iconos, contexto legible y controles de paginación. Las dos capturas anteriores de Inicio están en `docs/evidencia/ui-antes/`. El reporte navegable de la última ejecución queda en `playwright-report/index.html`.

`npx tsc --noEmit -p tsconfig.app.json` y Prettier: salida 0. Comparación SHA-256 de archivos protegidos: sin cambios en el núcleo de datos, rutas, configuración, manifiesto, lockfile ni presupuestos. Las skills oficiales y `skills-lock.json` pertenecen a las herramientas del proyecto, no al paquete de la aplicación.

## Límites y pendientes técnicos

- `npm audit`: **0 vulnerabilidades reportadas**, salida 0, después de `npm ci`. Detalle en `dependency-audit.json`; los 16 avisos moderados iniciales quedan documentados en `dependency-audit-before.json`. `npm ls glob minimatch` confirma las versiones corregidas, sin dependencias inválidas. Los overrides temporales cruzan versiones mayores transitivas y requieren revisión al actualizar la CLI; ver `MANTENIMIENTO-DEPENDENCIAS.md`. Esta auditoría no constituye una evaluación completa de seguridad.
- Las comprobaciones de accesibilidad son automáticas y de interacción acotada; no constituyen una certificación completa con lectores de pantalla.
- La demostración solo contiene una impartición y una actividad. No valida volumen institucional, otros tipos de actividad, intentos, prórrogas, cursos compartidos ni reglas oficiales.
- La paginación funciona sobre memoria. Las consultas paginadas, la autorización de servidor, Rules, autenticación y la seguridad de producción no están implementadas ni se presentan como validadas.
- Exportación: vista previa, sin archivo ni envío. Moodle/Firebase: ninguna conexión. No se realizaron commit, push, CI, despliegue ni pruebas sobre producción.
- Aceptación de Academia y revisión del propietario: pendientes.

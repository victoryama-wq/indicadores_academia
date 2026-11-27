# Estado actual de Indicadores de Academia

**Punto de reanudación al 27 de noviembre de 2026.** La navegación privada por grupos y docentes quedó publicada y validada con datos simulados. La siguiente decisión corresponde a Coordinación Académica.

## Última implementación y evidencia

| Ámbito | Resultado confirmado | Evidencia |
| --- | --- | --- |
| Implementación integrada | El PR #14 incorporó **Grupos y asignaturas** y el retorno al módulo con sus filtros tras renovar la sesión. SHA de aplicación `f17ee45b545b550c7864b68fddcb6797193cba50`. | [PR #14](https://github.com/victoryama-wq/indicadores_academia/pull/14) · [Commit integrado](https://github.com/victoryama-wq/indicadores_academia/commit/f17ee45b545b550c7864b68fddcb6797193cba50) |
| Pruebas del código integrado | **Validación Angular** y **E2E Edge** aprobadas para ese SHA en `main`. | [CI de main](https://github.com/victoryama-wq/indicadores_academia/actions/runs/45440265034) |
| Publicación confirmada por Sistemas | Proyecto `indicadores-academia`. Función `vistaAcademia`, revisión `vistaacademia-00003-vug`, con el 100 % del tráfico al validar. Hosting `vista-sistemas`, versión `9c6a9af4f3b6be4b`, publicada el 24 de noviembre de 2026 a las 11:51:50 de Cancún. | Cierre de publicación comunicado por Sistemas el 24 de noviembre. [Dominio publicado](https://indicadores-academia.web.app/reportes) |
| Recorrido en el dominio | Sistemas abrió ENF-301 y Docente Demo A desde Reportes. El regreso a cada listado conservó ENF-301. Al ingresar con Google desde un enlace sin sesión, volvió a **Grupos y asignaturas** con el grupo `g01`, periodo `p01` y corte `c01`. | [Repetir el recorrido filtrado](https://indicadores-academia.web.app/grupos?corte=c01&grupo=g01&periodo=p01) |

## Siguiente acción

**Coordinación Académica** revisa las vistas con datos simulados y comunica su visto bueno u observaciones. Puede seguir un caso desde Inicio hasta una actividad en Grupos y asignaturas, revisar los pendientes del responsable en Seguimiento docente y contrastarlos con Reportes para el mismo grupo y corte. **Sistemas** registrará la fecha y la decisión recibida y vinculará cualquier ajuste con su PR.

## Cómo mantener este registro

Actualiza el apartado afectado al cambiar el estado. Para trabajo en curso, deja la rama o PR, la verificación pendiente y el próximo paso. GitHub conserva el historial de integración y CI. Para producción, anota la última publicación confirmada por Sistemas con su fecha. El encabezado de cada nueva revisión debe indicar cuándo se revisó este resumen. [Protocolo de inicio y cierre](../AGENTS.md) · [Guía de publicación y recuperación](VISTA-FIREBASE.md)

# Reemplazo de Seguimiento académico en el sitio predeterminado

La publicación prevista de **Indicadores de Academia** sustituye la portada y las rutas de **Seguimiento académico** en `https://indicadores-academia.web.app`. Sistemas ingresa con su cuenta institucional y ve Coordinación con datos ficticios. El lector Moodle, su token, los XLSX institucionales y los cotejos permanecen en el equipo de Sistemas.

## Revisión local

Con Node 24.14.1 en la raíz, ejecuta `npm ci`, `npm run build` y `npm run build:vista`. La demo y el piloto local consumen la primera compilación. La segunda fija el perfil de Coordinación y genera `preview/functions/app/browser`. Con Node 22, instala las dependencias mediante `npm ci --engine-strict --prefix preview/functions` y ejecuta `node --test preview/functions/gateway.test.mjs`. El paquete de la función fija la dependencia transitiva `@firebase/database-compat` en 2.1.7 porque 2.1.8 exige Node 24.12 o superior. Con Microsoft Edge instalado, `npm run test:vista:ui` verifica la vista compilada usando identidades ficticias. `npm run test:moodle` y `npm run test:moodle:ui` prueban el piloto local.

El directorio público de Hosting es `preview/public`, con el formulario de ingreso y su JavaScript. La función `vistaAcademia` sirve los archivos de Angular después de validar la sesión, también al abrir directamente `/reportes`. La cookie HttpOnly dura una hora. El servidor comprueba el UID de Sistemas, el proveedor Google y el correo institucional verificado del dominio `tecplayacar.edu.mx`.

## Destino y configuración de acceso

- Proyecto y sitio predeterminado: `indicadores-academia`. En `firebase.json` el destino de Hosting es `vista-sistemas`. En `.firebaserc` ese destino apunta únicamente al sitio `indicadores-academia`. Comprueba la asociación local con `firebase target --project indicadores-academia`.
- Al autorizar la habilitación de Google, revisar primero qué permiten las reglas y funciones existentes a cualquier usuario autenticado. Firebase Authentication es compartido por las aplicaciones del proyecto. Conservar la aplicación web registrada y comprobar el dominio autorizado `indicadores-academia.web.app` y la configuración pública de Hosting en `/__/firebase/init.json`.
- En `preview/functions/.env.indicadores-academia`, fuera de Git, configurar `VISTA_ORIGEN=https://indicadores-academia.web.app` y `VISTA_SISTEMAS_UID` con **un único UID de Firebase Authentication**. Si la persona aún carece de UID, completar su primer ingreso con Google tras autorizar el proveedor. La función deniega el acceso mientras el UID autorizado esté vacío.

## Identificar la versión vigente antes de publicar

Ejecutar esta consulta de solo lectura y guardar su resultado con el registro de la publicación. Repetirla inmediatamente antes de cualquier reemplazo.

```powershell
$canales = firebase hosting:channel:list --site indicadores-academia --project indicadores-academia --json | ConvertFrom-Json
if ($canales.status -ne 'success') { throw 'No se pudo consultar el historial de Hosting.' }
$live = $canales.result.channels | Where-Object { $_.name -like '*/channels/live' }
if (-not $live.release.version.name) { throw 'Falta el identificador de la versión vigente.' }
$live.release | Select-Object name, releaseTime, @{Name='version'; Expression={$_.version.name}}
```

En la consulta del 20 de noviembre de 2026, el canal `live` apuntaba a la versión `6e70baa72c6ccfb3`, release `1791824929119000`, publicada el 12 de octubre de 2026 a las 12:08:49 de Cancún. Comprobar en el historial de Hosting que esa versión, o la que la haya sustituido, quedará retenida durante la validación.

## Publicación y restauración con autorización

1. Confirmar el destino, el registro previo y la disponibilidad del nombre `vistaAcademia` y de la base de código `vista-academia`. Revisar cualquier colisión con funciones existentes antes de continuar.
2. Publicar primero la función con `firebase deploy --project indicadores-academia --only functions:vista-academia`. Tras verificarla, cambiar el sitio con `firebase deploy --project indicadores-academia --only hosting:vista-sistemas`. La compilación privada permanece en el paquete de la función.
3. En el sitio predeterminado, verificar el ingreso de Sistemas, el rechazo de otra cuenta institucional, la recarga de `/reportes`, la navegación móvil y el cierre de sesión. Registrar la nueva versión del canal `live`.
4. Si se autoriza la restauración, abrir **Firebase Console → Hosting → indicadores-academia → Historial de versiones**, localizar la publicación anterior por versión y hora, abrir su menú y elegir **Revertir (Roll back)**. Consultar de nuevo `live`: la nueva release de restauración debe apuntar al ID de versión anterior. Abrir el sitio en una ventana privada y comprobar el recorrido de Seguimiento académico. Esta operación restaura los archivos y la configuración de Hosting. Los usuarios, los datos, los proveedores de acceso y las funciones se administran por separado.

[Historial y restauración de Firebase Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources) · [Ingreso con Google](https://firebase.google.com/docs/auth/web/google-signin) · [Cookies de sesión](https://firebase.google.com/docs/auth/admin/manage-cookies)

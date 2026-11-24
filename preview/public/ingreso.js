const button = document.querySelector('#ingresar');
const status = document.querySelector('#estado');

function destinationAfterLogin() {
  const path = new URLSearchParams(location.search).get('continuar');
  if (path?.startsWith('/')) {
    if (!URL.canParse(path, location.origin)) return '/inicio';
    const target = new URL(path, location.origin);
    if (
      target.origin === location.origin &&
      /^\/(?:inicio|reportes|grupos(?:\/[\w-]+)?|docentes(?:\/[\w-]+)?|(?:asignaturas|actividades|seguimiento)\/[\w-]+)\/?$/.test(target.pathname)
    ) {
      target.hash = location.hash;
      return target.href;
    }
  }
  return '/inicio';
}

try {
  const [{ initializeApp }, sdk, config] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js'),
    fetch('/__/firebase/init.json').then((res) => res.json()),
  ]);
  const auth = sdk.getAuth(initializeApp(config));
  await sdk.setPersistence(auth, sdk.inMemoryPersistence);
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ hd: 'tecplayacar.edu.mx', prompt: 'select_account' });
  if (new URLSearchParams(location.search).has('continuar')) {
    status.textContent = 'Inicia sesión para continuar en el módulo seleccionado.';
  }
  button.disabled = false;
  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Verificando acceso…';
    try {
      const { user } = await sdk.signInWithPopup(auth, provider);
      const response = await fetch('/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await user.getIdToken() }),
      });
      if (response.ok) {
        location.replace(destinationAfterLogin());
        return;
      }
      status.textContent =
        response.status === 403
          ? 'Esta cuenta no tiene acceso a la vista previa.'
          : 'Vuelve a iniciar sesión.';
    } catch {
      status.textContent = 'No se completó el ingreso con Google. Puedes volver a intentarlo.';
    } finally {
      await sdk.signOut(auth);
      button.disabled = false;
    }
  });
} catch {
  status.textContent =
    'El ingreso institucional está pendiente de configuración o no está disponible.';
}

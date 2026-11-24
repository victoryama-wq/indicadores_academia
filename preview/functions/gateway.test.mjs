import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { previewGateway } from './gateway.mjs';

test('la vista y sus recursos requieren una sesión Google de Sistemas', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'academia-vista-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, 'index.html'), '<h1>Vista privada</h1>');
  await writeFile(join(directory, 'main.js'), '/* privado */');
  const valid = {
    uid: 'sistemas',
    email: 'sistemas@tecplayacar.edu.mx',
    email_verified: true,
    firebase: { sign_in_provider: 'google.com' },
    auth_time: Math.floor(Date.now() / 1000),
  };
  const users = {
    sistemas: valid,
    coordinacion: { ...valid, uid: 'coord' },
    externo: { ...valid, email: 'test@example.org' },
    sinVerificar: { ...valid, email_verified: false },
    antiguo: { ...valid, auth_time: 0 },
    otroProveedor: { ...valid, firebase: { sign_in_provider: 'password' } },
  };
  let revoked = false;
  const app = previewGateway({
    directory,
    origin: () => 'https://demo.example',
    systemsUid: () => 'sistemas',
    auth: {
      async verifyIdToken(token, checkRevoked) {
        assert.equal(checkRevoked, true);
        if (!users[token]) throw Error();
        return users[token];
      },
      async createSessionCookie() {
        return 'prueba';
      },
      async verifySessionCookie(cookie, checkRevoked) {
        assert.equal(checkRevoked, true);
        if (cookie !== 'prueba' || revoked) throw Error();
        return valid;
      },
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((ok) => server.once('listening', ok));
  t.after(() => new Promise((ok) => server.close(ok)));
  const call = (path, options) =>
    fetch('http://127.0.0.1:' + server.address().port + path, { redirect: 'manual', ...options });
  const login = (idToken, origin = 'https://demo.example') =>
    call('/sesion', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  for (const path of ['/grupos?periodo=p01&grupo=g01', '/docentes/d01?corte=c01', '/reportes']) {
    const unauthenticated = await call(path);
    assert.equal(unauthenticated.status, 302);
    const loginUrl = new URL(unauthenticated.headers.get('location'), 'http://localhost');
    assert.equal(loginUrl.pathname, '/ingreso.html');
    assert.equal(loginUrl.searchParams.get('continuar'), path);
  }
  assert.equal((await call('/main.js')).status, 401);
  for (const id of ['externo', 'sinVerificar', 'coordinacion', 'otroProveedor'])
    assert.equal((await login(id)).status, 403);
  assert.equal((await login('sistemas', 'https://otro.example')).status, 403);
  assert.equal((await login('antiguo')).status, 401);
  const session = await login('sistemas');
  assert.equal(session.status, 204);
  assert.match(session.headers.get('set-cookie'), /HttpOnly/i);
  const headers = { Cookie: '__session=prueba' };
  for (const path of ['/reportes', '/main.js']) {
    const response = await call(path, { headers });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  assert.equal((await call('/api/moodle', { headers })).status, 403);
  const exit = await call('/salir', {
    method: 'POST',
    headers: { ...headers, Origin: 'https://demo.example' },
  });
  assert.equal(exit.status, 303);
  assert.match(exit.headers.get('set-cookie'), /__session=;/);
  revoked = true;
  assert.equal((await call('/main.js', { headers })).status, 401);
});

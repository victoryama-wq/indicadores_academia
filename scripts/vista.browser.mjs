import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { previewGateway } from '../preview/functions/gateway.mjs';

// El navegador usa el formulario, las rutas y la cookie reales. Solo se simula Firebase.
test('Edge abre la vista de Coordinación con una sesión ficticia de Sistemas', async (t) => {
  const claims = (uid) => ({
    uid,
    email: uid + '@tecplayacar.edu.mx',
    email_verified: true,
    firebase: { sign_in_provider: 'google.com' },
    auth_time: Math.floor(Date.now() / 1000),
  });
  const gateway = previewGateway({
    origin: () => origin,
    systemsUid: () => 'sistemas-demo',
    directory: fileURLToPath(new URL('../preview/functions/app/browser/', import.meta.url)),
    auth: {
      async verifyIdToken(token) {
        assert.ok(['sistemas-demo', 'otra-cuenta-demo'].includes(token));
        return claims(token);
      },
      async createSessionCookie() {
        return 'sesion-de-prueba';
      },
      async verifySessionCookie(value) {
        assert.equal(value, 'sesion-de-prueba');
        return claims('sistemas-demo');
      },
    },
  });
  const loginPage = await readFile(new URL('../preview/public/ingreso.html', import.meta.url));
  const loginScript = await readFile(new URL('../preview/public/ingreso.js', import.meta.url));
  const server = createServer((req, res) => {
    if (req.url === '/ingreso.html')
      return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(loginPage);
    if (req.url === '/ingreso.js')
      return res
        .writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        .end(loginScript);
    if (req.url === '/__/firebase/init.json')
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    gateway(req, res);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge' });
  try {
    for (const width of [1440, 375]) {
      await t.test(width + ' px', async () => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        context.setDefaultTimeout(10000);
        try {
          let selectedUid = 'otra-cuenta-demo';
          await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.origin === origin) return route.continue();
            if (url.hostname !== 'www.gstatic.com') return route.abort();
            const headers = { 'Access-Control-Allow-Origin': '*' };
            if (url.pathname.endsWith('/firebase-app.js')) {
              return route.fulfill({
                headers,
                contentType: 'text/javascript',
                body: 'export function initializeApp() {}',
              });
            }
            if (url.pathname.endsWith('/firebase-auth.js')) {
              return route.fulfill({
                headers,
                contentType: 'text/javascript',
                body: `
                export function getAuth() {}
                export const inMemoryPersistence = {};
                export async function setPersistence() {}
                export class GoogleAuthProvider { setCustomParameters() {} }
                export async function signInWithPopup() { return { user: { getIdToken: () => window.testUid() } }; }
                export async function signOut() {}
              `,
              });
            }
            return route.abort();
          });
          const page = await context.newPage();
          await page.addInitScript(() => sessionStorage.setItem('academia-profile', 'sistemas'));
          await page.exposeFunction('testUid', () => selectedUid);
          await page.goto(origin + '/reportes');
          await expect(page).toHaveURL(origin + '/ingreso.html');
          const ingresar = page.getByRole('button', { name: 'Ingresar con Google' });
          await ingresar.click();
          await expect(page.getByRole('status')).toContainText('Esta cuenta no tiene acceso');
          selectedUid = 'sistemas-demo';
          await ingresar.click();
          await expect(
            page.getByRole('heading', { name: 'Seguimiento a plataforma Moodle' }),
          ).toBeVisible();
          await page.goto(origin + '/reportes');
          await page.reload();
          await expect(page.getByRole('heading', { name: 'Reportes', exact: true })).toBeVisible();
          for (const path of ['/admin/insumos', '/reportes/moodle']) {
            assert.equal((await context.request.get(origin + path)).status(), 403);
          }
          if (width === 375) await page.getByRole('button', { name: 'Abrir menú' }).click();
          await expect(
            page.getByText('Vista previa de Coordinación', { exact: false }).first(),
          ).toBeVisible();
          await expect(page.locator('app-profile-selector')).toHaveCount(0);
          await expect(page.getByRole('link', { name: 'Insumos por ciclo' })).toHaveCount(0);
          await page.getByRole('link', { name: 'Seguimiento docente' }).click();
          await expect(
            page.getByRole('heading', { name: 'Seguimiento docente', exact: true }),
          ).toBeVisible();
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          );
          await page.getByRole('button', { name: 'Salir' }).click();
          await expect(page).toHaveURL(origin + '/ingreso.html');
          assert.ok(!(await context.cookies()).some((cookie) => cookie.name === '__session'));
          await page.goto(origin + '/reportes');
          await expect(page).toHaveURL(origin + '/ingreso.html');
        } finally {
          await context.close();
        }
      });
    }
  } finally {
    await browser.close();
  }
});

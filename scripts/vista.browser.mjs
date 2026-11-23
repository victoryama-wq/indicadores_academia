import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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
    for (const width of [1440, 375, 320]) {
      await t.test(width + ' px', async (viewportTest) => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        context.setDefaultTimeout(10000);
        try {
          const moodleRequests = [];
          let selectedUid = 'otra-cuenta-demo';
          await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.port === '4380' || url.pathname.startsWith('/api/moodle'))
              moodleRequests.push(url.pathname);
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
          await viewportTest.test(
            'actividad, listas, corte y cambio de contexto a ' + width + ' px',
            async () => {
              const tracking = page.getByRole('region', { name: 'Seguimiento de tareas' });
              const query = async (label) => {
                if (width > 700)
                  await page.getByRole('button', { name: label, exact: true }).click();
                else {
                  await page.getByRole('combobox', { name: 'Consulta', exact: true }).click();
                  await page.getByRole('option', { name: label, exact: true }).click();
                  await expect(page.getByRole('listbox', { includeHidden: true })).toHaveCount(0);
                }
              };
              const capture = async (name, locator) => {
                if (!process.env.VISTA_CAPTURAS) return;
                await mkdir(process.env.VISTA_CAPTURAS, { recursive: true });
                if (locator) {
                  const bounds = await locator.boundingBox();
                  await page.setViewportSize({ width, height: Math.ceil(bounds.height) + 320 });
                  await locator.evaluate((el) =>
                    el.scrollIntoView({ block: 'center', behavior: 'instant' }),
                  );
                  await locator.screenshot({
                    path: process.env.VISTA_CAPTURAS + '/' + name + '-' + width + '.png',
                  });
                  await page.setViewportSize({ width, height: 900 });
                } else {
                  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
                  await page.screenshot({
                    path: process.env.VISTA_CAPTURAS + '/' + name + '-' + width + '.png',
                  });
                }
              };
              await query('Docentes con pendientes');
              const originButton = page.getByRole('button', {
                name: 'Ver las 2 entregas pendientes de Docente Demo E',
                exact: true,
              });
              await expect(originButton).toBeVisible();
              await capture('docentes');
              await capture('desglose', page.locator('section.breakdown'));
              await originButton.focus();
              await page.keyboard.press('Enter');
              const rows = tracking.getByRole('listitem');
              await expect(
                tracking.getByRole('heading', { name: 'Pendientes de calificar' }),
              ).toBeFocused();
              await expect(rows).toHaveCount(2);
              for (const [i, id] of ['DEMO-C19', 'DEMO-C20'].entries())
                await expect(rows.nth(i)).toContainText(id);
              await expect(tracking).toContainText('Balance inicial');
              await expect(tracking).toContainText('ADM-102');
              await expect(tracking).toContainText('18 de 20 entregas calificadas');
              await expect(tracking).toContainText('90%');
              await expect(tracking.getByRole('combobox')).toHaveCount(0);
              await capture('pendientes', tracking);
              await expect(tracking.getByRole('button', { name: '0 Por revisar' })).toBeVisible();
              await expect(tracking.getByRole('button', { name: '0 Borradores' })).toBeVisible();
              await tracking.getByRole('button', { name: '4 Sin entrega' }).click();
              await page.reload();
              await expect(rows).toHaveCount(4);
              for (const [i, id] of ['DEMO-C21', 'DEMO-C22', 'DEMO-C23', 'DEMO-C24'].entries()) {
                await expect(rows.nth(i)).toContainText(id);
                await expect(rows.nth(i)).toContainText('05/11/2026 18:00');
                await expect(rows.nth(i)).toContainText('1 día 5 horas 59 minutos de atraso');
              }
              await expect(tracking).toContainText('06/11/2026 23:59 · Cancún');
              assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              );
              assert.deepEqual(
                (await new AxeBuilder({ page }).analyze()).violations.map((v) => [
                  v.id,
                  v.nodes.map((n) => n.target),
                ]),
                [],
              );
              await capture('tareas', tracking);
              await tracking.getByRole('button', { name: 'Volver al desglose' }).click();
              await expect(originButton).toBeFocused();
              await expect(tracking).toHaveCount(0);
              await page.goBack();
              await expect(rows).toHaveCount(4);
              await page.goBack();
              await expect(rows).toHaveCount(2);
              await tracking.getByRole('button', { name: 'Volver al desglose' }).click();
              await page
                .getByRole('button', { name: 'Ver las 6 entregas pendientes de Docente Demo D' })
                .click();
              const activities = tracking.getByRole('button', { name: / · 1 entrega/ });
              await expect(activities).toHaveCount(6);
              await activities.first().click();
              await expect(rows).toHaveCount(1);
              await tracking.getByRole('button', { name: 'No calculable Sin entrega' }).click();
              await expect(tracking).toContainText('Población de la actividad por confirmar');
              await expect(rows).toHaveCount(0);
              await query('Estudiantes con tarea calificada');
              await page
                .getByRole('button', {
                  name: 'Ver las 2 entregas calificadas de Estudiante Reporte Demo 1',
                  exact: true,
                })
                .click();
              await expect(activities).toHaveCount(2);
              await activities.last().click();
              await expect(rows).toHaveCount(1);
              await expect(rows.first()).toContainText('REP-DEMO-01');
              await page.goto(
                origin +
                  '/reportes?periodo=p01&grupo=g01&asignatura=i01&actividadDetalle=a01&listaDetalle=pendiente',
              );
              await expect(tracking).toContainText('Plan de cuidados');
              await expect(tracking).toContainText('75%');
              await expect(rows).toHaveCount(6);
              await expect(tracking).not.toContainText('DEMO-C');
              await page.goto(origin + '/reportes?periodo=p01&grupo=sin-coincidencias');
              await expect(
                page.getByRole('heading', { name: 'Sin resultados para estos filtros' }),
              ).toBeVisible();
              await expect(tracking).toHaveCount(0);
              assert.deepEqual(moodleRequests, []);
            },
          );
          for (const path of ['/admin/insumos', '/reportes/moodle']) {
            assert.equal((await context.request.get(origin + path)).status(), 403);
          }
          if (width < 640) await page.getByRole('button', { name: 'Abrir menú' }).click();
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

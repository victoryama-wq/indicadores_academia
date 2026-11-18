// Ejecutar sobre el build local. El servidor recibe exclusivamente datos sintéticos.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pilotServer } from './pilot.mjs';
import { classify } from './reader.mjs';

const activities = [22041, 22042, 22043, 22044, 22045, 22046].map((id, i) => ({
  id,
  cmid: 53765 + 3 * i,
  name: 'Unidad ' + (i + 1),
  supported: true,
}));
const users = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  fullname: 'Estudiante ficticio ' + (i + 1),
  username: 'tup' + String(i + 1).padStart(4, '0'),
}));
const submissions = users
  .slice(0, 20)
  .map((u) => ({ userid: u.id, status: 'submitted', attemptnumber: 0 }));
const grades = users.slice(0, 18).map((u) => ({ userid: u.id, grade: '8', attemptnumber: 0 }));
let reads = 0;
const course = '603. Fundamentos De Contabilidad 27-1';
const reader = {
  catalog: async () => ({ course, courseId: 4455, activities }),
  snapshot: async (id) => {
    reads++;
    if (id === activities[1].id) throw new Error('Consulta incompleta en datos ficticios.');
    let result;
    if (id === activities[2].id) result = classify(users, [], [], { kind: 'course' });
    else if (id === activities[3].id) {
      result = classify(users, submissions.slice(0, 1), [], {
        kind: 'restricted',
        userIds: [1, 2],
      });
    } else if (id === activities[4].id) result = classify(users, submissions.slice(0, 1), []);
    else if (id === activities[5].id)
      result = classify(users, [], grades.slice(0, 1), { kind: 'course' });
    else
      result = classify(users, submissions, grades, reads === 1 ? { kind: 'course' } : undefined);
    return {
      course,
      activity: activities.find((a) => a.id === id),
      readAt: new Date(Date.UTC(2026, 10, 17, 16, 45, reads)).toISOString(),
      ...result,
    };
  },
};
const server = pilotServer(reader, 'demo-local');
await new Promise((resolve, reject) =>
  server.once('error', reject).listen(0, '127.0.0.1', resolve),
);
let browser;
try {
  browser = await chromium.launch(
    process.env.PILOT_BROWSER_PATH
      ? { executablePath: process.env.PILOT_BROWSER_PATH }
      : { channel: 'msedge' },
  );
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  // Conserva el origen del piloto en Edge, incluso si Sistemas está usando el 4380.
  // Todas las peticiones de esta página van exclusivamente al servidor ficticio.
  const testOrigin = 'http://127.0.0.1:' + server.address().port;
  await context.route('http://127.0.0.1:4380/**', async (route) => {
    const url = new URL(route.request().url());
    const headers = {
      ...route.request().headers(),
      host: server.address().address + ':' + server.address().port,
    };
    if (headers.origin === url.origin) headers.origin = testOrigin;
    const response = await route.fetch({
      url: testOrigin + url.pathname + url.search,
      headers,
      maxRedirects: 0,
    });
    await route.fulfill({ response });
    await response.dispose();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('http://127.0.0.1:4380/reportes');
  await page.getByRole('combobox', { name: 'Perfil simulado' }).click();
  await page.getByRole('option', { name: 'Sistemas', exact: true }).click();
  await page.getByRole('link', { name: 'Abrir piloto local de lectura Moodle' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:4380/reportes/moodle');
  assert.equal(reads, 0);
  await page.getByLabel('Clave local del piloto').fill('demo-local');
  await page.getByRole('button', { name: 'Consultar curso' }).click();
  await expect(page.locator('.overview-number')).toHaveText(['24', '20']);
  await expect(page.locator('.progress-block b')).toHaveText('90%');
  await expect(page.locator('.state-card strong')).toHaveText(['18', '2', '4', '0', '0']);
  const cut = page.locator('.section-head small');
  const initialCut = await cut.innerText();
  await mkdir('test-results/moodle-ui', { recursive: true });
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.state-card')).toHaveCount(5);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: 'test-results/moodle-ui/resumen-' + width + '.png',
      fullPage: true,
    });
  }
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => [
      v.id,
      v.nodes.map((n) => [n.target, n.failureSummary]),
    ]),
    [],
  );
  await page.getByRole('link', { name: /Sin entrega/ }).click();
  await expect(page.getByRole('heading', { name: 'Sin entrega (4)' })).toBeVisible();
  assert.equal(await page.locator('li').count(), 4);
  await expect(page.locator('.records li div small')).toHaveText([
    'TUP0021',
    'TUP0022',
    'TUP0023',
    'TUP0024',
  ]);
  await page.getByRole('link', { name: 'Volver al resumen' }).click();
  await page.getByRole('link', { name: /Entregas pendientes de calificar/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Entregas pendientes de calificar (2)' }),
  ).toBeVisible();
  assert.equal(await page.locator('li').count(), 2);
  await expect(cut).toHaveText(initialCut);
  await expect(page.getByLabel('Actividad', { exact: true })).toHaveValue('22041');
  assert.equal(reads, 1);
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => [
      v.id,
      v.nodes.map((n) => [n.target, n.failureSummary]),
    ]),
    [],
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('link', { name: 'Volver al resumen' }).click();
  for (const [state, count] of [
    ['calificadas', 18],
    ['borradores', 0],
    ['revisar', 0],
  ]) {
    await page.locator('[data-state=' + state + ']').click();
    await expect(page.locator('.detail li')).toHaveCount(count);
    if (!count) await expect(page.getByText('Ningún estudiante en este estado.')).toBeVisible();
    await page.getByRole('link', { name: 'Volver al resumen' }).click();
  }
  assert.equal(reads, 1);
  await page.getByRole('button', { name: 'Actualizar lectura' }).click();
  await expect(cut).toContainText('11:45:02');
  assert.equal(reads, 2);
  const cards = page.locator('.state-card strong');
  await expect(cards).toHaveText(['18', '2', 'No calculable', '0', '0']);
  await page.locator('[data-state=sin-entrega]').click();
  await expect(page.locator('.detail')).toContainText('No calculable');
  await expect(page.locator('.detail li')).toHaveCount(0);
  await expect(cut).toContainText('11:45:02');
  const select = page.getByLabel('Actividad', { exact: true });
  await select.selectOption('22044');
  await expect(cards).toHaveText(['0', '1', '1', '0', '0']);
  await expect(page.locator('.overview')).toContainText(
    'Estudiantes a quienes corresponde la actividad: 2',
  );
  await page.locator('[data-state=sin-entrega]').click();
  await expect(page.locator('.detail li')).toHaveCount(1);
  await expect(page.locator('.detail li')).toContainText('TUP0002');
  await select.selectOption('22045');
  await expect(cards).toHaveText(['0', '1', 'No calculable', '0', '0']);
  await page.locator('[data-state=sin-entrega]').click();
  await expect(page.locator('.detail')).toContainText('no acredita la lista completa');
  await expect(page.locator('.detail li')).toHaveCount(0);
  await select.selectOption('22046');
  await expect(page.locator('.progress-block b')).toHaveText('Avance por confirmar');
  await expect(page.locator('.track')).toHaveCount(0);
  await expect(page.locator('.progress-block')).not.toContainText('0 de 0');
  await expect(page.locator('[data-state=revisar] strong')).toHaveText('1');
  await page.getByLabel('Actividad', { exact: true }).selectOption('22043');
  await expect(page.locator('.progress-block b')).toHaveText('Sin entregas');
  await page.getByLabel('Actividad', { exact: true }).selectOption('22042');
  await expect(page.getByRole('alert')).toContainText('Consulta incompleta');
  await expect(page.locator('.overview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar consulta' }).click();
  await expect(page.getByLabel('Clave local del piloto')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Clave local del piloto')).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(
    'Piloto aprobado: resumen, listas de 4 y 2, misma lectura, error, cierre, recarga, móvil y AXE.',
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

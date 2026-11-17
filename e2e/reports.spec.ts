import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { sampleBatch } from '../src/app/core/reporting/report-fixtures';
import { InputBatch, InputType } from '../src/app/core/reporting/report-models';

const context =
  'periodo=p01&corte=c01&carrera=todas&modalidad=todas&grupo=todos&asignatura=todas&docente=todos&tipo=todos&unidad=todas';
const nextCycle = context.replace('p01', 'p02');
async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}
async function audit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
async function capture(page: Page, name: string) {
  await page.locator('#main').focus();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const path = test.info().outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: 'image/png' });
}
async function upload(page: Page, type: InputType, batch: InputBatch, activate = true) {
  const card = page.getByTestId('input-' + type);
  await card.locator('input[type=file]').setInputFiles({
    name: type + '-ficticio.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(batch, null, 2)),
  });
  await card.getByRole('button', { name: 'Validar archivo', exact: true }).click();
  if (activate) {
    await expect(card.getByRole('status')).toContainText('Validación correcta');
    await card.getByRole('button', { name: 'Activar simulación', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Activación simulada completada');
  }
  return card;
}

for (const width of [1440, 375, 320]) {
  test(
    'reportes e insumos: consultas, teclado y accesibilidad a ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/reportes?' + context);
      await expect(page.getByTestId('report-people')).toHaveText('38');
      await expect(page.getByTestId('report-graded')).toHaveText('31');
      await expect(page.getByTestId('report-pending')).toHaveText('17');
      await expect(page.getByTestId('report-summary')).toContainText('54 pares');
      await expect(
        page
          .locator('.metric-card')
          .filter({ hasText: 'Avance de calificación' })
          .locator('strong'),
      ).toHaveText('65%');
      await expect(
        page.getByText('Tarea 40% · Integradora 30% · Foro 10% · Examen 20%', { exact: true }),
      ).toHaveCount(3);
      await expect(
        page.getByRole('table', { name: 'Desglose por tipo de actividad' }).getByRole('row'),
      ).toHaveCount(5);
      await expect(page.getByText('Calendario pendiente', { exact: true })).toHaveCount(2);
      await audit(page);
      await capture(page, 'reportes-' + width);
      const consulta = page.getByRole('combobox', { name: 'Consulta', exact: true });
      await consulta.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(page.getByTestId('graded-students')).toContainText('24 estudiantes únicos');
      const student = page
        .getByRole('table', { name: 'Estudiantes con tarea calificada' })
        .getByRole('row')
        .filter({ hasText: 'Estudiante Reporte Demo 1' });
      await expect(student).toHaveCount(1);
      await expect(student.getByRole('cell').last()).toHaveText('2');
      await choose(page, 'Consulta', 'Docentes con pendientes');
      await expect(
        page.getByRole('table', { name: 'Docentes con pendientes' }).getByRole('row'),
      ).toHaveCount(4);
      await page.reload();
      await expect(consulta).toContainText('Docentes con pendientes');
      await audit(page);
      await choose(page, 'Perfil simulado', 'Sistemas');
      await page.goto('/admin/insumos?' + nextCycle);
      await expect(page.getByTestId('input-calendario')).toContainText('Sin versión vigente');
      const invalid = sampleBatch('spai', 'p02');
      if (invalid.tipo !== 'spai') throw new Error('Plantilla incorrecta');
      invalid.filas.push(invalid.filas[0]);
      const card = await upload(page, 'spai', invalid, false);
      await expect(card.getByRole('table', { name: 'Rechazos de validación' })).toContainText(
        'Registro duplicado',
      );
      await expect(
        card.getByRole('button', { name: 'Activar simulación', exact: true }),
      ).toBeDisabled();
      await audit(page);
      await capture(page, 'insumos-' + width);
      expect(errors).toEqual([]);
    },
  );
}

test('filtros de reporte se conservan por URL y el ciclo nuevo limpia el contexto anterior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reportes?' + context);
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await choose(page, 'Modalidad', 'Ejecutiva');
  await expect(page.getByTestId('report-pending')).toHaveText('2');
  await choose(page, 'Carrera', 'Licenciatura en Administración');
  await choose(page, 'Grupo', 'EJE-101');
  await choose(page, 'Asignatura e impartición', 'Gestión ejecutiva · EJE-101');
  await choose(page, 'Tipo de actividad', 'Actividad integradora');
  await choose(page, 'Unidad', 'Unidad 2');
  await choose(page, 'Entregas extemporáneas', 'Extemporánea');
  await expect(page.getByTestId('report-graded')).toHaveText('0');
  await expect(page.getByTestId('report-pending')).toHaveText('1');
  await expect(page.getByTestId('report-people')).toHaveText('1');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Grupo', exact: true })).toContainText('EJE-101');
  await expect(page.getByTestId('report-summary')).toContainText('1 pares');
  await choose(page, 'Ciclo', '27-2 · Preparación (demo)');
  await expect(page).toHaveURL(/grupo=todos/);
  await expect(
    page.getByText('Información incompleta · Totales no calculables', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('report-graded')).toHaveCount(0);
  await expect(page.getByText('Gestión ejecutiva · EJE-101', { exact: true })).toHaveCount(0);
  await choose(page, 'Ciclo', '27-1 · En operación (demo)');
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await choose(page, 'Modalidad', 'Mixta');
  await choose(page, 'Entregas extemporáneas', 'Sin criterio configurado');
  await expect(page.getByTestId('report-summary')).toContainText('2 sin criterio configurado');
});

test('activación parcial, reemplazo válido e inválido, bajas y aislamiento entre ciclos', async ({
  page,
}) => {
  await page.goto('/reportes?' + context);
  await choose(page, 'Perfil simulado', 'Sistemas');
  await page.goto('/admin/insumos?' + nextCycle);
  const calendar = await upload(page, 'calendario', sampleBatch('calendario', 'p02'));
  await expect(calendar.getByTestId('current-version')).toHaveText('Versión vigente: 1');
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(
    page.getByText('Información incompleta · Totales no calculables', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Tarea de demostración', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Revisar insumos por ciclo' }).click();
  await upload(page, 'spai', sampleBatch('spai', 'p02'));
  await upload(page, 'calificaciones', sampleBatch('calificaciones', 'p02'));
  const invalid = sampleBatch('calificaciones', 'p02');
  if (invalid.tipo !== 'calificaciones') throw new Error('Plantilla incorrecta');
  invalid.filas.push(invalid.filas[0]);
  const book = await upload(page, 'calificaciones', invalid, false);
  await expect(book.getByRole('row').last().locator('[data-label="Fila"]')).toHaveText('2');
  await expect(book.getByTestId('current-version')).toHaveText('Versión vigente: 1');
  await expect(
    book.getByRole('button', { name: 'Activar simulación', exact: true }),
  ).toBeDisabled();
  await upload(page, 'calificaciones', sampleBatch('calificaciones', 'p01'), false);
  await expect(book.getByRole('table')).toContainText('El ciclo del archivo no coincide');
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(page.getByTestId('report-graded')).toHaveText('1');
  await expect(page.getByTestId('report-people')).toHaveText('1');
  await page.reload();
  await expect(page.getByTestId('report-graded')).toHaveText('1');
  await page.getByRole('link', { name: 'Revisar insumos por ciclo' }).click();
  const pending = sampleBatch('calificaciones', 'p02');
  if (pending.tipo !== 'calificaciones') throw new Error('Plantilla incorrecta');
  pending.filas[0].calificacion = null;
  pending.filas[0].calificadaEn = null;
  await upload(page, 'calificaciones', pending);
  await expect(book.getByTestId('current-version')).toHaveText('Versión vigente: 2');
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(page.getByTestId('report-pending')).toHaveText('1');
  await expect(page.getByTestId('report-graded')).toHaveText('0');
  await page.getByRole('link', { name: 'Revisar insumos por ciclo' }).click();
  await upload(page, 'bajas', sampleBatch('bajas', 'p02'));
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sin resultados para estos filtros' }),
  ).toBeVisible();
  await expect(page.getByTestId('report-summary')).toContainText('0 pares');
  await page.goto('/reportes?' + context);
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await expect(page.getByTestId('report-pending')).toHaveText('17');
});

test('acceso directo por perfil, calendario desconocido y estados incompleto/error', async ({
  page,
}) => {
  await page.goto('/admin/insumos?' + context);
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  await choose(page, 'Perfil simulado', 'Dirección');
  await page.goto('/reportes?' + context);
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await expect(page.getByRole('link', { name: 'Revisar insumos por ciclo' })).toHaveCount(0);
  await page.goto('/admin/insumos?' + context);
  await expect(page.getByRole('heading', { name: 'Acceso restringido' })).toBeVisible();
  await choose(page, 'Perfil simulado', 'Sistemas');
  await page.goto('/admin/insumos?' + context);
  await expect(page.getByRole('heading', { name: 'Insumos por ciclo' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('input-calendario')).toContainText('Versión vigente: 1');
  await choose(page, 'Perfil simulado', 'Coordinación');
  await expect(page).toHaveURL(/\/inicio/);
  await page.goto('/reportes?' + context);
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await page.goto('/reportes?' + context.replace('p01', 'inexistente'));
  await expect(page.getByTestId('report-graded')).toHaveCount(0);
  await expect(
    page.getByText('Información incompleta · Totales no calculables', { exact: true }),
  ).toBeVisible();
  await page.goto('/reportes?' + context.replace('c01', 'c00'));
  await expect(
    page.getByRole('heading', { name: 'Corte sin información suficiente' }),
  ).toBeVisible();
  await page.goto('/reportes?' + context.replace('c01', 'error'));
  await expect(
    page.getByRole('heading', { name: 'No pudimos consultar este corte' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Volver al corte de demostración' }).click();
  await expect(page).toHaveURL(/\/reportes/);
  await expect(page.getByTestId('report-graded')).toHaveText('31');
});

test('Reportes usa el calendario activo, conserva versiones rechazadas y aísla ciclos y pestañas', async ({
  page,
  context: browserContext,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/reportes?' + context);
  await choose(page, 'Perfil simulado', 'Sistemas');
  await page.getByRole('link', { name: 'Insumos por ciclo', exact: true }).click();
  await choose(page, 'Ciclo de los insumos', '27-2 · Preparación (demo)');
  await upload(page, 'calendario', sampleBatch('calendario', 'p02'));
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(page.getByRole('region', { name: 'Versiones usadas en el reporte' })).toContainText(
    'Calendario Moodle · v1',
  );
  await expect(page.getByText(/Faltan: Exportación SPAI, Libro de calificaciones/)).toBeVisible();
  await expect(
    page.getByText('Sin movimientos de bajas cargados. La población es provisional.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId('report-graded')).toHaveCount(0);
  await page.getByRole('link', { name: 'Revisar insumos por ciclo' }).click();
  const revised = sampleBatch('calendario', 'p02');
  if (revised.tipo !== 'calendario') throw new Error('Plantilla incorrecta');
  revised.filas[0].actividad = 'Tarea ficticia revisada';
  revised.filas[0].pesoTarea = 50;
  revised.filas[0].pesoExamen = 10;
  await upload(page, 'calendario', revised);
  const invalid = structuredClone(revised);
  invalid.filas[0].actividad = 'Esta carga no debe publicarse';
  invalid.filas.push(invalid.filas[0]);
  const card = await upload(page, 'calendario', invalid, false);
  await expect(card.getByTestId('current-version')).toHaveText('Versión vigente: 2');
  await expect(
    card.getByRole('button', { name: 'Activar simulación', exact: true }),
  ).toBeDisabled();
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(page.getByRole('region', { name: 'Versiones usadas en el reporte' })).toContainText(
    'Calendario Moodle · v2',
  );
  await expect(
    page.getByRole('heading', { name: 'Tarea ficticia revisada', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Tarea 50% · Integradora 30% · Foro 10% · Examen 10%', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Esta carga no debe publicarse', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Tarea ficticia revisada', exact: true }),
  ).toBeVisible();
  const otherTab = await browserContext.newPage();
  await otherTab.goto('/reportes?' + nextCycle);
  await expect(
    otherTab.getByRole('region', { name: 'Versiones usadas en el reporte' }),
  ).toContainText('Calendario Moodle · Sin carga');
  await expect(
    otherTab.getByRole('heading', { name: 'Tarea ficticia revisada', exact: true }),
  ).toHaveCount(0);
  await otherTab.close();
  await choose(page, 'Ciclo', '27-1 · En operación (demo)');
  await expect(page.getByTestId('report-graded')).toHaveText('31');
  await expect(
    page.getByRole('heading', { name: 'Tarea ficticia revisada', exact: true }),
  ).toHaveCount(0);
  await choose(page, 'Ciclo', '27-2 · Preparación (demo)');
  await expect(
    page.getByRole('heading', { name: 'Tarea ficticia revisada', exact: true }),
  ).toBeVisible();
});

test('plantillas descargables, ejemplos documentados y rechazos de archivo vacío o fecha inválida', async ({
  page,
}) => {
  await page.goto('/reportes?' + context);
  await choose(page, 'Perfil simulado', 'Sistemas');
  await page.goto('/admin/insumos?' + nextCycle);
  for (const type of ['calendario', 'spai', 'bajas', 'calificaciones'] as const) {
    const card = page.getByTestId('input-' + type);
    const downloading = page.waitForEvent('download');
    await card.getByRole('button', { name: /^Descargar ejemplo ficticio/ }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(type + '-p02-ficticio.json');
    const path = await download.path();
    expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual(sampleBatch(type, 'p02'));
    await card
      .locator('input[type=file]')
      .setInputFiles('docs/ejemplos-insumos/' + type + '-p02-ficticio.json');
    await card.getByRole('button', { name: 'Validar archivo', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Validación correcta');
  }
  const card = page.getByTestId('input-calendario');
  await card
    .locator('input[type=file]')
    .setInputFiles({ name: 'vacio.json', mimeType: 'application/json', buffer: Buffer.from('') });
  await expect(card.getByRole('status')).toContainText('El archivo está vacío');
  await expect(
    card.getByRole('button', { name: 'Activar simulación', exact: true }),
  ).toBeDisabled();
  const invalid = sampleBatch('calendario', 'p02');
  if (invalid.tipo !== 'calendario') throw new Error('Plantilla incorrecta');
  invalid.filas[0].apertura = '2027-02-30T12:00:00-05:00';
  await upload(page, 'calendario', invalid, false);
  await expect(card.getByRole('table')).toContainText('apertura: fecha ISO inválida');
  await expect(
    card.getByRole('table').getByRole('row').last().locator('[data-label="Fila"]'),
  ).toHaveText('1');
  await expect(card).toContainText('Sin versión vigente');
});

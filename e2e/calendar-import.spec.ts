import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resolve } from 'node:path';

// Every XLSX path runs in a browser timezone different from the calendar's -05:00.
test.use({ timezoneId: 'Asia/Tokyo' });

const query =
  'periodo=p02&corte=c01&carrera=todas&modalidad=todas&grupo=todos&asignatura=todas&docente=todos&tipo=todos&unidad=todas';
const fixture = (name: string) =>
  resolve('docs/ejemplos-insumos/calendario-27-2-ficticio-' + name + '.xlsx');
async function choose(page: Page, label: string, option: string) {
  if (['Modalidad', 'Unidad', 'Tipo de actividad', 'Ciclo'].includes(label)) {
    const filters = page.getByRole('button', { name: /Filtros de consulta/ });
    await expect(filters).toBeVisible();
    if ((await filters.getAttribute('aria-expanded')) === 'false') await filters.click();
  }
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function setup(page: Page) {
  await page.goto('/reportes');
  await choose(page, 'Perfil simulado', 'Sistemas');
  await page.goto('/admin/insumos?' + query);
}
async function upload(page: Page, name: string) {
  const card = page.getByTestId('input-calendario');
  await card.locator('input[type=file]').setInputFiles(fixture(name));
  await card.getByRole('button', { name: 'Validar archivo', exact: true }).click();
  return card;
}
async function audit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}
for (const width of [1440, 375])
  test(
    'XLSX: activar, rechazar reemplazo, recargar y aislar ciclos a ' + width,
    async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await setup(page);
      expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
        'Asia/Tokyo',
      );
      const card = await upload(page, 'valido');
      await expect(card.getByRole('status')).toContainText('Validación correcta');
      await expect(card).toContainText('84 filas revisadas');
      await card.getByText('Escolarizada', { exact: true }).click();
      await expect(card.getByRole('table', { name: 'Escolarizada', exact: true })).toContainText(
        '11/02/2027 23:59',
      );
      await expect(card.getByRole('table', { name: 'Escolarizada', exact: true })).toContainText(
        '12/02/2027 23:59',
      );
      await audit(page);
      await card.getByRole('button', { name: 'Activar simulación', exact: true }).click();
      await expect(card.getByTestId('current-version')).toHaveText('Versión vigente: 1');
      await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
      const schedule = page.getByRole('region', {
        name: 'Programación del calendario importado',
        exact: true,
      });
      await expect(schedule).toContainText('84 actividades');
      await expect(
        page.getByText('Calendario general · Vinculación pendiente · Totales no calculables', {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByText('Faltan:', { exact: false })).toContainText(
        'Exportación SPAI, Libro de calificaciones',
      );
      await expect(
        page.getByText('Sin movimientos de bajas cargados.', { exact: false }),
      ).toBeVisible();
      await expect(page.getByTestId('report-people')).toHaveCount(0);
      await schedule.getByText('Transversales · Módulo 2', { exact: true }).click();
      await expect(
        schedule.getByRole('table', { name: 'Transversales · Módulo 2', exact: true }),
      ).toContainText('12/03/2027 00:00');
      await expect(schedule).toContainText('Propedéutico · Calendario pendiente');
      await audit(page);
      await page.screenshot({
        path: test.info().outputPath('calendario-' + width + '.png'),
        fullPage: false,
      });
      await test.info().attach('calendario-' + width, {
        path: test.info().outputPath('calendario-' + width + '.png'),
        contentType: 'image/png',
      });
      await page.reload();
      await expect(schedule).toContainText('84 actividades');
      await page.goto('/admin/insumos?' + query);
      await upload(page, 'fecha-invalida');
      await expect(card.getByRole('status')).toContainText('Validación rechazada');
      await expect(card.getByRole('table', { name: 'Rechazos de validación' })).toContainText(
        'CALENDARIO VIRT, EJE, POSGRADO',
      );
      await expect(card.getByRole('table', { name: 'Rechazos de validación' })).toContainText('31');
      await expect(
        card.getByRole('button', { name: 'Activar simulación', exact: true }),
      ).toBeDisabled();
      await expect(card.getByTestId('current-version')).toHaveText('Versión vigente: 1');
      await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
      await expect(schedule).toContainText('84 actividades');
      await choose(page, 'Modalidad', 'Virtual');
      await expect(schedule).toContainText('63 actividades');
      await choose(page, 'Unidad', 'Unidad 7');
      await expect(schedule).toContainText('9 actividades');
      await choose(page, 'Tipo de actividad', 'Foro');
      await expect(schedule).toContainText('3 actividades');
      await choose(page, 'Ciclo', '27-1 · En operación (demo)');
      await expect(schedule).toHaveCount(0);
      await expect(page.getByTestId('report-graded')).toHaveText('31');
      await expect(page.getByText('06/11/2026 23:59', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('12/03/2027 00:00', { exact: true })).toHaveCount(0);
      await choose(page, 'Ciclo', '27-2 · Preparación (demo)');
      await expect(schedule).toContainText('84 actividades');
      await expect(page.getByText('06/11/2026 23:59', { exact: true })).toHaveCount(0);
    },
  );
test('XLSX: encabezado por bloque inválido y ciclo equivocado no activan', async ({ page }) => {
  await setup(page);
  const card = await upload(page, 'encabezado-invalido');
  await expect(card.getByRole('status')).toContainText('Validación rechazada');
  await expect(card.getByRole('table', { name: 'Rechazos de validación' })).toContainText('30');
  await expect(card).toContainText('Falta o se duplica el encabezado CIERRE.');
  await expect(
    card.getByRole('button', { name: 'Activar simulación', exact: true }),
  ).toBeDisabled();
  await choose(page, 'Ciclo de los insumos', '27-1 · En operación (demo)');
  await upload(page, 'valido');
  await expect(card.getByRole('status')).toContainText('Validación rechazada');
  await expect(card).toContainText('solo corresponde al ciclo 27-2');
  await expect(card.getByTestId('current-version')).toHaveText('Versión vigente: 1');
  await card.locator('input[type=file]').setInputFiles({
    name: 'corrupto.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('archivo ficticio dañado'),
  });
  await card.getByRole('button', { name: 'Validar archivo', exact: true }).click();
  await expect(card.getByRole('table', { name: 'Rechazos de validación' })).toContainText(
    'No se pudo abrir el XLSX.',
  );
  await expect(
    card.getByRole('button', { name: 'Activar simulación', exact: true }),
  ).toBeDisabled();
  await expect(card.getByTestId('current-version')).toHaveText('Versión vigente: 1');
});

import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { populationSample } from '../src/app/core/reporting/population-fixtures';
test('Sistemas activa el padrón y las asignaciones XLSX, conserva la versión e informa cobertura por ciclo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/reportes');
  await page.getByRole('combobox', { name: 'Perfil simulado' }).click();
  await page.getByRole('option', { name: 'Sistemas', exact: true }).click();
  await page.goto('/admin/insumos?periodo=p01');
  for (const [type, file] of [
    ['saeko', 'saeko'],
    ['spai', 'asignaciones'],
  ]) {
    const card = page.getByTestId(`input-${type}`);
    await card
      .locator('input[type=file]')
      .setInputFiles(resolve(`docs/ejemplos-insumos/${file}-27-1-ficticio.xlsx`));
    if (type === 'saeko') await card.getByLabel(/Fecha de corte del padrón/).fill('2026-11-12');
    await card.getByRole('button', { name: 'Validar archivo', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Validación correcta');
    if (type === 'spai') {
      await expect(card).toContainText('Padrón activo de Saeko: 7 estudiantes únicos');
      await expect(card).toContainText('6 vínculos estudiante–asignatura');
      await card.getByText('Consultar filas y evidencia del cruce').click();
      const filter = card.getByLabel('Detalle del cruce');
      await filter.selectOption('vinculos');
      await expect(card).toContainText('Grupo base + Matrícula explícita');
      await expect(card).toContainText('Comparte con');
      await filter.selectOption('incidencias');
      await expect(card).toContainText(/fila 7: .*Asignación por confirmar \(C\.A/);
      await filter.selectOption('propuestas');
      await expect(card).toContainText('999 → TUP999');
    }
    await card.getByRole('button', { name: 'Activar simulación', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Activación simulada completada');
  }
  const roster = page.getByTestId('input-saeko'),
    bad = populationSample('saeko', 'p01');
  if (bad.tipo !== 'saeko') throw Error('muestra');
  bad.filas.push({ ...bad.filas[0], fila: 20 });
  await roster.locator('input[type=file]').setInputFiles({
    name: 'duplicado.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await roster.getByRole('button', { name: 'Validar archivo' }).click();
  await expect(roster.getByRole('button', { name: 'Activar simulación' })).toBeDisabled();
  await expect(roster.getByTestId('current-version')).toHaveText('Versión vigente: 1');
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  await expect(page).toHaveURL(/\/reportes\?[^#]*periodo=p01/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Cobertura del ciclo seleccionado' }),
  ).toBeVisible();
  await expect(page.locator('app-population-view')).toContainText(
    'Población vinculada: 5 estudiantes únicos',
  );
  await expect(page.locator('app-population-view')).toContainText('2026-11-12');
  await expect(page.getByText(/No calculables: falta verificar/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('combobox', { name: 'Ciclo del cruce' }).click();
  await page.getByRole('option', { name: /27-2/ }).click();
  await expect(page).toHaveURL(/periodo=p02/);
  await expect(page.locator('app-population-view')).toHaveCount(0);
  await page.goto('/admin/insumos?periodo=p02');
  const second = populationSample('saeko', 'p02');
  if (second.tipo !== 'saeko') throw Error('muestra');
  second.filas = second.filas.slice(5, 6); // C.A sin matrícula explícita en este catálogo.
  for (const [type, source] of [
    ['calendario', resolve('docs/ejemplos-insumos/calendario-27-2-ficticio-valido.xlsx')],
    ['saeko', second],
    ['spai', populationSample('spai', 'p02')],
  ] as const) {
    const card = page.getByTestId('input-' + type);
    await card.locator('input[type=file]').setInputFiles(
      typeof source === 'string'
        ? source
        : {
            name: type + '-ficticio.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(source)),
          },
    );
    await card.getByRole('button', { name: 'Validar archivo' }).click();
    await card.getByRole('button', { name: 'Activar simulación' }).click();
    await expect(card.getByRole('status')).toContainText('Activación simulada completada');
  }
  await page.getByRole('link', { name: 'Consultar reportes de este ciclo' }).click();
  const population = page.locator('app-population-view');
  await expect(population).toContainText('Padrón activo de Saeko: 1 estudiantes únicos');
  await expect(population).toContainText('Población vinculada: 0 estudiantes únicos');
  await expect(page.getByText(/No calculables: falta verificar/)).toBeVisible();
  const calendar = page.getByRole('region', { name: 'Programación del calendario importado' });
  await expect(calendar).toContainText('84 actividades');
  await page.getByRole('button', { name: /Filtros de consulta/ }).click();
  await page.getByRole('combobox', { name: 'Modalidad', exact: true }).click();
  await page.getByRole('option', { name: 'Virtual', exact: true }).click();
  await expect(calendar).toContainText('63 actividades');
  await expect(population).toContainText('Población vinculada: 0 estudiantes únicos');
});

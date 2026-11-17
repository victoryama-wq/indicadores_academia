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

test('SPAI XLSX distingue números de texto y rechaza grupos ajenos sin reemplazar vínculos', async ({
  page,
}) => {
  await page.goto('/reportes');
  await page.getByRole('combobox', { name: 'Perfil simulado' }).click();
  await page.getByRole('option', { name: 'Sistemas', exact: true }).click();
  await page.goto('/admin/insumos?periodo=p01');
  const roster = populationSample('saeko', 'p01');
  if (roster.tipo !== 'saeko') throw Error('muestra');
  roster.filas = ['10201', '0027', '1234567890123456'].map((digits, i) => ({
    ...roster.filas[i],
    matricula: 'TUP' + digits,
    grupo: 'C.A',
  }));
  const people = page.getByTestId('input-saeko'),
    courses = page.getByTestId('input-spai');
  await people
    .locator('input[type=file]')
    .setInputFiles({
      name: 'padron-ficticio.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(roster)),
    });
  await people.getByRole('button', { name: 'Validar archivo' }).click();
  await people.getByRole('button', { name: 'Activar simulación' }).click();
  await expect(people.getByRole('status')).toContainText('Activación simulada completada');
  async function upload(name: string) {
    await courses
      .locator('input[type=file]')
      .setInputFiles(resolve('e2e/fixtures/' + name + '-ficticio.xlsx'));
    await courses.getByRole('button', { name: 'Validar archivo' }).click();
  }
  await upload('spai-matriculas');
  const preview = courses.locator('app-population-view');
  await preview.getByText('Consultar filas y evidencia del cruce').click();
  await preview.getByLabel('Detalle del cruce').selectOption('vinculos');
  const links = preview.getByRole('listitem');
  await expect(links).toHaveCount(3);
  await expect(links.nth(0)).toContainText(/TUP10201 .*Materia ficticia 1/);
  await expect(links.nth(1)).toContainText(/TUP10201 .*Materia ficticia 2/);
  await expect(links.nth(2)).toContainText(/TUP0027 .*Materia ficticia 4/);
  await preview.getByLabel('Detalle del cruce').selectOption('incidencias');
  await expect(preview).toContainText('27 · Sin coincidencia exacta');
  await expect(preview).toContainText('precisión fiable');
  await courses.getByRole('button', { name: 'Activar simulación' }).click();
  await expect(courses.getByRole('status')).toContainText('Activación simulada completada');
  const version = await courses.getByTestId('current-version').innerText();
  await upload('spai-ciclos-invalidos');
  const rejected = courses
    .getByRole('table', { name: 'Rechazos de validación' })
    .locator('tbody tr');
  await expect(rejected).toHaveCount(4);
  for (const [i, field] of ['Grupo base', 'Grupo base', 'Comparte con', 'Comparte con'].entries()) {
    await expect(rejected.nth(i).locator('td').nth(1)).toHaveText(String(i + 3));
    await expect(rejected.nth(i)).toContainText(field);
  }
  await expect(courses.locator('app-population-view')).toHaveCount(0);
  await expect(courses.getByRole('button', { name: 'Activar simulación' })).toBeDisabled();
  await page.reload();
  await expect(courses.getByTestId('current-version')).toHaveText(version);
  await expect(page.locator('app-population-view')).toContainText(
    '3 vínculos estudiante–asignatura confirmados',
  );
});

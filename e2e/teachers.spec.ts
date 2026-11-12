import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const context =
  'periodo=p01&corte=c01&carrera=todas&modalidad=todas&grupo=todos&asignatura=todas&docente=todos&tipo=todos&unidad=todas';
async function audit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function capture(page: Page, name: string) {
  const path = test.info().outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true });
  await test.info().attach(name, { path, contentType: 'image/png' });
}
test('la búsqueda de estudiantes se conserva por actividad sin contaminar otro docente', async ({
  page,
}) => {
  const search = page.getByRole('textbox', { name: 'Buscar estudiante o matrícula' });
  await page.goto('/actividades/a02?' + context);
  await search.fill('019');
  await expect(page.getByTestId('record-summary')).toHaveText(
    '1 registros · 1 vencidos · 0 en plazo',
  );
  await page.goto('/docentes/d02?' + context);
  await page.getByRole('link', { name: 'Abrir asignatura' }).click();
  await page.getByRole('link', { name: 'Abrir actividad' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('record-summary')).toHaveText(
    '4 registros · 1 vencidos · 1 en plazo',
  );
  await search.fill('033');
  await page.getByRole('link', { name: /^pendientes de calificar 2 / }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('record-summary')).toHaveText(
    '2 registros · 1 vencidos · 1 en plazo',
  );
  await page.goto('/actividades/a02?' + context);
  await expect(search).toHaveValue('019');
  await page.getByRole('link', { name: 'Ver ficha de Estudiante Demo 019' }).click();
  await expect(page).toHaveURL(/\/seguimiento\/a02-e019(?:\?|$)/);
  await page.reload();
  await page.getByRole('link', { name: 'Volver al listado de estudiantes' }).click();
  await expect(search).toHaveValue('019');
  await expect(page.getByTestId('record-summary')).toHaveText(
    '1 registros · 1 vencidos · 0 en plazo',
  );
});
for (const width of [1440, 375, 320]) {
  test('docentes: totales, contexto y accesibilidad a ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/docentes');
    await expect(
      page.getByRole('heading', { name: 'Seguimiento docente', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Seguimiento docente', exact: true, includeHidden: true }),
    ).toHaveAttribute('aria-current', 'page');
    const rows = [
      ['d01', '21', '9', '6', '3'],
      ['d02', '2', '2', '1', '1'],
      ['d03', '2', '0', '0', '0'],
    ];
    for (const [id, graded, pending, overdue, within] of rows) {
      const row = page.getByTestId('teacher-' + id);
      for (const [field, value] of [
        ['graded', graded],
        ['pending', pending],
        ['overdue', overdue],
        ['within', within],
      ]) {
        await expect(row.getByTestId(field)).toHaveText(value);
      }
    }
    await expect(page.locator('app-profile-selector mat-label')).toBeVisible();
    await audit(page);
    await capture(page, 'docentes-' + width);
    await page.getByRole('searchbox', { name: 'Buscar docente' }).fill('Demo A');
    await expect(page.getByTestId('teacher-d02')).toHaveCount(0);
    await page.getByRole('link', { name: 'Ver detalle de Docente Demo A' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Docente Demo A', exact: true })).toBeVisible();
    for (const [label, value] of [
      ['estudiantes únicos', '31'],
      ['registros esperados', '36'],
      ['pendientes de calificar', '9'],
    ]) {
      await expect(
        page.locator('app-metrics .metric').filter({ hasText: label }).locator('strong'),
      ).toHaveText(value);
    }
    await expect(page.getByTestId('assignment-i02')).toContainText('3 entregas pendientes');
    await expect(page.getByTestId('assignment-i03')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Docente Demo A', exact: true })).toBeVisible();
    await audit(page);
    await capture(page, 'docente-detalle-' + width);
    await page
      .getByRole('link', { name: 'Ver pendientes de Diagnóstico comunitario', exact: true })
      .click();
    await expect(page).toHaveURL(/actividades\/a02/);
    await expect(page.getByTestId('record-summary')).toHaveText(
      '2 registros · 1 vencidos · 1 en plazo',
    );
    await expect(page.locator('app-record-list tbody tr')).toHaveCount(2);
    await page.getByRole('button', { name: 'Vista previa de exportación' }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'ENF-401 · Salud Comunitaria · Diagnóstico comunitario',
    );
    await expect(page.getByRole('dialog')).toContainText('3 de 3 registros');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('link', { name: 'Ver ficha de Estudiante Demo 019' }).click();
    await expect(page).toHaveURL(/seguimiento\/a02-e019/);
    await expect(page.locator('app-followup')).toContainText('Salud Comunitaria');
    await expect(page.locator('app-followup')).not.toContainText('Enfermería Clínica');
    await page.reload();
    await page.getByRole('link', { name: 'Volver al listado de estudiantes' }).click();
    await expect(page.getByTestId('record-summary')).toHaveText(
      '2 registros · 1 vencidos · 1 en plazo',
    );
    await page.getByRole('link', { name: 'Volver al detalle docente' }).click();
    await page.getByRole('link', { name: 'Volver al listado de docentes' }).click();
    await expect(page.getByRole('searchbox', { name: 'Buscar docente' })).toHaveValue('Demo A');
    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Buscar docente' })).toHaveValue('Demo A');
    const params = new URL(page.url()).searchParams;
    for (const [key, value] of new URLSearchParams(context)) expect(params.get(key)).toBe(value);
    expect(page.url()).not.toContain('Demo');
    expect(params.has('origenDocente')).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('filtros docentes y retorno desde los pendientes del docente B', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/docentes?' + context);
  await choose(page, 'Carrera', 'Licenciatura en Enfermería');
  await expect(page.getByTestId('teacher-d03')).toHaveCount(0);
  await choose(page, 'Modalidad', 'Escolarizada');
  await choose(page, 'Grupo', 'ENF-401');
  await expect(page.getByTestId('teacher-d01').getByTestId('pending')).toHaveText('3');
  await expect(page.getByTestId('teacher-d02').getByTestId('pending')).toHaveText('2');
  await choose(page, 'Asignatura e impartición', 'Farmacología · ENF-401');
  await expect(page.getByTestId('teacher-d01')).toHaveCount(0);
  await page.getByRole('link', { name: 'Ver detalle de Docente Demo B' }).click();
  await page.getByRole('link', { name: 'Ver pendientes de Ficha farmacológica' }).click();
  await expect(page.getByTestId('record-summary')).toHaveText(
    '2 registros · 1 vencidos · 1 en plazo',
  );
  await expect(page.locator('app-record-list')).toContainText('Estudiante Demo 033');
  await expect(page.locator('app-record-list')).not.toContainText('Estudiante Demo 019');
  await page.getByRole('link', { name: 'Volver al detalle docente' }).click();
  await page.getByRole('link', { name: 'Volver al listado de docentes' }).click();
  await expect(page.getByRole('combobox', { name: 'Grupo', exact: true })).toContainText('ENF-401');
  await expect(page.getByRole('combobox', { name: 'Asignatura e impartición' })).toContainText(
    'Farmacología',
  );
  await page.getByRole('searchbox', { name: 'Buscar docente' }).fill('No existe');
  await expect(
    page.getByRole('heading', { name: 'No hay docentes para esta selección' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restablecer consulta docente' }).click();
  await choose(page, 'Carrera', 'Licenciatura en Administración');
  await choose(page, 'Modalidad', 'Mixta');
  await expect(page.getByTestId('teacher-d03').getByTestId('pending')).toHaveText('0');
  await expect(page.getByTestId('teacher-d01')).toHaveCount(0);
  await choose(page, 'Periodo', '27-2 · Sin datos demo');
  await expect(
    page.getByRole('heading', { name: 'No hay docentes para esta selección' }),
  ).toBeVisible();
});

test('acceso directo, cero pendientes, identificador inválido, corte incompleto y error', async ({
  page,
}) => {
  await page.goto('/docentes/d03');
  await expect(page.getByRole('heading', { name: 'Docente Demo C', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver pendientes de Proceso administrativo' }).click();
  await expect(page.getByTestId('record-summary')).toHaveText(
    '0 registros · 0 vencidos · 0 en plazo',
  );
  await expect(page.locator('app-record-list tbody tr')).toHaveCount(0);
  await page.goto('/docentes/d01?' + context.replace('grupo=todos', 'grupo=g03'));
  await expect(
    page.getByRole('heading', { name: 'Sin resultados para este docente' }),
  ).toBeVisible();
  await page.goto('/docentes/desconocido');
  await expect(page.getByRole('heading', { name: 'Docente no disponible' })).toBeVisible();
  await page.goto('/docentes?' + context.replace('corte=c01', 'corte=c00'));
  await expect(page.getByTestId('teacher-d01').getByTestId('pending')).toHaveText('No calculable');
  await page.getByRole('link', { name: 'Ver detalle de Docente Demo A' }).click();
  await expect(page.locator('app-metrics')).toContainText('Información incompleta');
  await expect(page.locator('app-metrics .metric')).toHaveCount(0);
  await page.goto('/docentes?' + context.replace('corte=c01', 'corte=error'));
  await expect(
    page.getByRole('heading', { name: 'No pudimos consultar este corte' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Volver al corte de demostración' }).click();
  await expect(page).toHaveURL(/\/docentes\?/);
  await expect(page.getByTestId('teacher-d01')).toBeVisible();
});

test('filas académicas separan imparticiones y actividades en un contexto amplio', async ({
  page,
}) => {
  await page.goto('/grupos/g02?' + context);
  const subjects = page.getByRole('table', { name: 'Asignaturas del grupo' });
  await expect(subjects.getByRole('row').filter({ hasText: 'Salud Comunitaria' })).toContainText(
    '6 / 6',
  );
  await expect(subjects.getByRole('row').filter({ hasText: 'Farmacología' })).toContainText(
    '4 / 4',
  );
  await subjects
    .getByRole('row')
    .filter({ hasText: 'Salud Comunitaria' })
    .getByRole('link', { name: 'Abrir asignatura' })
    .click();
  const activities = page.getByRole('table', { name: 'Actividades de la asignatura' });
  await expect(
    activities.getByRole('row').filter({ hasText: 'Diagnóstico comunitario' }),
  ).toContainText('1 / 3 recibidas');
  await expect(
    activities.getByRole('row').filter({ hasText: 'Plan de intervención' }),
  ).toContainText('2 / 3 recibidas');
  await activities
    .getByRole('row')
    .filter({ hasText: 'Plan de intervención' })
    .getByRole('link', { name: 'Abrir actividad' })
    .click();
  await expect(page).toHaveURL(/actividades\/a03/);
  await expect(page.getByTestId('record-summary')).toHaveText(
    '3 registros · 1 vencidos · 0 en plazo',
  );
  await page.getByRole('link', { name: /^pendientes de calificar 1 / }).click();
  await expect(page.getByTestId('record-summary')).toHaveText(
    '1 registros · 1 vencidos · 0 en plazo',
  );
});

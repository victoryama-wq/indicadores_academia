import { expect, test, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const context =
  'periodo=p01&corte=c01&carrera=enf&modalidad=escolarizada&grupo=g01&tipo=todos&unidad=todas&docente=todos';
async function ready(page: Page, title: string) {
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function audit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
for (const width of [1440, 1280, 1024, 768, 640, 375, 320]) {
  test(`recorrido Coordinación y accesibilidad a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/inicio?' + context);
    await ready(page, 'Seguimiento a plataforma Moodle');
    await expect(page.locator('app-profile-selector mat-label')).toBeVisible();
    await audit(page);
    await test.info().attach('inicio', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await page.getByRole('link', { name: 'Ver grupos y asignaturas' }).click();
    await ready(page, 'Grupo ENF-301');
    await audit(page);
    await page.getByRole('link', { name: 'Abrir asignatura' }).click();
    await ready(page, 'Enfermería Clínica');
    await audit(page);
    await page.getByRole('link', { name: 'Abrir actividad' }).click();
    await ready(page, 'Plan de cuidados');
    await audit(page);
    await page.getByRole('link', { name: /^pendientes de calificar 6 / }).click();
    await expect(page.getByTestId('record-summary')).toHaveText(
      '6 registros · 4 vencidos · 2 en plazo',
    );
    await expect(page.locator('app-record-list tbody tr')).toHaveCount(6);
    await expect(page.locator('app-record-list .pill.red')).toHaveCount(4);
    await expect(page.locator('app-record-list .pill.amber')).toHaveCount(2);
    await expect(page).toHaveURL(/estado=pendiente/);
    await expect(
      page
        .getByRole('navigation', { name: 'Filtrar registros por estado' })
        .getByRole('link', { name: /^Pendientes/ }),
    ).toHaveAttribute('aria-current', 'true');
    await expect(
      page.getByRole('table', { name: 'Registros de seguimiento' }).getByRole('columnheader'),
    ).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Primera página', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Última página', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('app-record-list tbody tr')).toHaveCount(6);
    await audit(page);
    await test.info().attach('pendientes', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
    await page.getByRole('link', { name: 'Ver ficha de Estudiante Demo 019' }).click();
    await ready(page, 'Estudiante Demo 019');
    await audit(page);
    await expect(page).toHaveURL(/seguimiento\/r019/);
    expect(page.url()).not.toMatch(/DEMO|Estudiante/);
    await page.reload();
    await ready(page, 'Estudiante Demo 019');
    await page.getByRole('link', { name: 'Volver al listado de estudiantes' }).click();
    await expect(page.locator('app-record-list tbody tr')).toHaveCount(6);
    await expect(page).toHaveURL(/periodo=p01/);
    await expect(page).toHaveURL(/corte=c01/);
    await expect(page).toHaveURL(/modalidad=escolarizada/);
    const preview = page.getByRole('button', { name: 'Vista previa de exportación' });
    await preview.click();
    await expect(page.getByRole('dialog')).toContainText('6 registros');
    await expect(page.getByRole('dialog').locator('li')).toHaveCount(6);
    // Axe debe medir el contraste final, no la opacidad durante la apertura de Material.
    await expect(page.getByRole('dialog').locator('.mat-mdc-dialog-inner-container')).toHaveCSS(
      'opacity',
      '1',
    );
    await audit(page);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(preview).toBeFocused();
    if (width < 1024) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
      await audit(page);
      await page.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}
test('búsqueda, orden y página sobreviven a ficha, regreso y recarga', async ({ page }) => {
  await page.goto('/actividades/a01?' + context + '&estado=todos&tamano=5&pagina=2&orden=desc');
  await expect(page.locator('app-record-list tbody tr')).toHaveCount(5);
  const first = await page.locator('app-record-list tbody tr').first().innerText();
  await page
    .getByRole('link', { name: /Ver ficha de/ })
    .first()
    .click();
  await page.getByRole('link', { name: 'Volver al listado de estudiantes' }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.locator('app-record-list tbody tr').first()).toHaveText(first, {
    useInnerText: true,
  });
  await page.getByLabel('Buscar estudiante o matrícula').fill('Demo 023');
  await expect(page.locator('app-record-list tbody tr')).toHaveCount(1);
  expect(page.url()).not.toContain('023');
  await page.getByRole('link', { name: 'Ver ficha de Estudiante Demo 023' }).click();
  await page.reload();
  await page.goBack();
  await expect(page.getByLabel('Buscar estudiante o matrícula')).toHaveValue('Demo 023');
  await page.getByRole('link', { name: /^pendientes de calificar 6 / }).click();
  await expect(page.locator('app-record-list tbody tr')).toHaveCount(6);
  await page.getByLabel('Buscar estudiante o matrícula').fill('ninguno');
  await expect(
    page.getByRole('heading', { name: 'No hay registros para esta selección' }),
  ).toBeVisible();
});

test('teclado: salto al contenido, foco del menú y cambio a escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto('/inicio?' + context);
  await ready(page, 'Seguimiento a plataforma Moodle');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const toggle = page.getByRole('button', { name: 'Abrir menú' });
  await toggle.focus();
  await toggle.press('Enter');
  const close = page.getByRole('button', { name: 'Cerrar menú', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('link', { name: /Calidad de información/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.press('Enter');
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Seguimiento académico', exact: true })
    .click();
  await ready(page, 'Grupos de tu ámbito');
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(close).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.workspace')).not.toHaveAttribute('inert');
  await expect(page.locator('main')).toBeFocused();
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Seguimiento académico', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await audit(page);
});
test('cifras abren sus registros y cero es calificación', async ({ page }) => {
  await page.goto('/actividades/a01?' + context);
  for (const [label, total] of [
    ['registros esperados 30', 30],
    ['entregas recibidas 24', 24],
    ['calificadas 18', 18],
    ['sin entrega 6', 6],
  ] as const) {
    await page.getByRole('link', { name: label }).click();
    await expect(page.getByTestId('record-summary')).toContainText(`${total} registros`);
  }
  await page.goto('/seguimiento/r001?' + context);
  await ready(page, 'Estudiante Demo 001');
  await expect(page.getByText('El cero sí es una calificación.')).toBeVisible();
});
test('perfiles, menú administrativo y rechazo de acceso directo', async ({ page }) => {
  await page.goto('/inicio');
  await ready(page, 'Seguimiento a plataforma Moodle');
  const profile = page.getByRole('combobox', { name: 'Perfil simulado' });
  await profile.focus();
  await profile.press('Enter');
  await expect(page.getByRole('option')).toHaveCount(3);
  await audit(page);
  await profile.press('ArrowDown');
  await profile.press('Enter');
  await expect(profile).toContainText('Dirección');
  await expect(profile).toBeFocused();
  await page.goto('/actividades/a01?' + context + '&estado=pendiente');
  await ready(page, 'Plan de cuidados');
  await expect(page.getByRole('button', { name: 'Vista previa de exportación' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Usuarios y catálogos/ })).toHaveCount(0);
  await page.goto('/admin/catalogos');
  await ready(page, 'Acceso restringido');
  await page.getByRole('combobox', { name: 'Perfil simulado' }).click();
  await page.getByRole('option', { name: 'Sistemas', exact: true }).click();
  await page.getByRole('link', { name: /Usuarios y catálogos/ }).click();
  await ready(page, 'Administración e integración');
  await expect(page.getByText('PRÓXIMAMENTE', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Perfil simulado' }).click();
  await page.getByRole('option', { name: 'Coordinación', exact: true }).click();
  await ready(page, 'Seguimiento a plataforma Moodle');
});
test('filtros, carga, vacío, corte incompleto, error y rutas inválidas', async ({ page }) => {
  await page.goto('/inicio?' + context);
  await ready(page, 'Seguimiento a plataforma Moodle');
  await page.getByRole('combobox', { name: 'Modalidad', exact: true }).click();
  await page.getByRole('option', { name: 'Mixta', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No hay grupos para estos filtros' }),
  ).toBeVisible();
  await expect(
    page.locator('.metric').filter({ hasText: 'registros esperados' }).locator('strong'),
  ).toHaveText('0');
  await expect(page.locator('.metric[href]')).toHaveCount(0);
  await page.goto('/inicio?' + context.replace('corte=c01', 'corte=c00'));
  await expect(page.getByText('Información incompleta', { exact: true })).toBeVisible();
  await expect(page.locator('.metric')).toHaveCount(0);
  await page.goto('/inicio?' + context.replace('corte=c01', 'corte=error'));
  await ready(page, 'No pudimos consultar este corte');
  await expect(page.locator('.metric')).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver al corte de demostración' }).click();
  await ready(page, 'Seguimiento a plataforma Moodle');
  for (const route of [
    '/grupos/no-existe',
    '/asignaturas/no-existe',
    '/actividades/no-existe',
    '/seguimiento/no-existe',
  ]) {
    await page.goto(route);
    await ready(page, 'Recurso no disponible');
  }
  await page.goto('/ruta-inexistente');
  await ready(page, 'Página no encontrada');
});

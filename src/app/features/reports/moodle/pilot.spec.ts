import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MoodlePilot } from './pilot';

describe('Lectura Moodle por actividad', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('abre el detalle con el mismo corte y descarta las cifras si falla una consulta nueva', async () => {
    const activity = { id: 22041, cmid: 53765, name: 'Unidad 1', supported: true };
    const second = { ...activity, id: 22042, name: 'Unidad 2' };
    const students = Array.from({ length: 24 }, (_, i) => ({
      name: 'Estudiante ficticio ' + i,
      registration: 'TUP' + String(i + 1).padStart(4, '0'),
      state: i < 18 ? 'calificadas' : i < 20 ? 'pendientes' : 'sin-entrega',
      updatedAt: null,
    }));
    const api = vi.fn(async (url: string) => {
      if (url.endsWith('/22042'))
        return Response.json({ error: 'Consulta incompleta.' }, { status: 502 });
      if (url.endsWith('/22041'))
        return Response.json({
          activity,
          students,
          unidentified: 1,
          readAt: '2026-11-17T16:45:00Z',
        });
      return Response.json({ course: 'Curso ficticio', activities: [activity, second] });
    });
    vi.stubGlobal('fetch', api);
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'reportes/moodle', component: MoodlePilot }])],
    });
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/reportes/moodle', MoodlePilot);
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Clave local del piloto');
    expect(api).not.toHaveBeenCalled();
    page.key.set('clave-ficticia');
    await harness.fixture.whenStable();
    expect(root.querySelector('.overview-number')?.textContent).toBe('24');
    expect(root.querySelector('[data-state="calificadas"] strong')?.textContent).toBe('18');
    expect(root.querySelectorAll('.state-card').length).toBe(5);
    for (const [state, n] of [
      ['pendientes', 2],
      ['sin-entrega', 4],
    ] as const) {
      await harness.navigateByUrl('/reportes/moodle?actividad=22041&estado=' + state);
      expect(root.querySelectorAll('li').length).toBe(n);
    }
    expect(api).toHaveBeenCalledTimes(2);
    await harness.navigateByUrl('/reportes/moodle?actividad=22042');
    await harness.fixture.whenStable();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('Consulta incompleta');
    expect(root.querySelector('.overview')).toBeNull();
    page.key.set('');
    await harness.fixture.whenStable();
    expect(root.textContent).toContain('Clave local del piloto');
  });
});

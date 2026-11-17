import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { DemoData } from '../demo-data';
import { ACADEMIC_DATA, TEACHER_CONTEXT } from '../models';
import { NavigationContext } from '../navigation-context';
import { CycleInputStore } from './cycle-input-store';
import { calendarTestSheets } from './calendar-test-fixture';
import { parseCalendarSheets } from './calendar-xlsx';
import { validateInput } from './input-validation';
import { selectReport } from './report-selectors';
import { sampleBatch } from './report-fixtures';

describe('Calendario XLSX 27-2', () => {
  it('lee 84 actividades en cuatro bloques, sin inventar cursos ni pesos por curso', () => {
    const result = parseCalendarSheets(calendarTestSheets(), 'p02');
    expect(result.errors).toEqual([]);
    expect(result.rowCount).toBe(84);
    expect(result.batch?.filas).toEqual([]);
    if (result.batch?.tipo !== 'calendario') throw new Error('Calendario requerido');
    const rows = result.batch.programacion!;
    expect(rows[0]).toMatchObject({
      hoja: 'CALENDARIO OPERATIVO ESC-SALUD',
      fila: 3,
      unidad: 'u01',
      apertura: '2027-01-12T00:00:00-05:00',
      entrega: '2027-02-11T23:59:00-05:00',
      corte: '2027-02-12T23:59:00-05:00',
      ponderacion: 25,
      parcial: 'PARCIAL 1 | 30%',
    });
    expect(rows[42]).toMatchObject({
      bloque: 'transversal2',
      fila: 31,
      unidad: 'u01',
      apertura: '2027-03-12T00:00:00-05:00',
      entrega: null,
    });
    expect(rows[63]).toMatchObject({
      bloque: 'profesionalizante',
      fila: 56,
      entrega: null,
      corte: '2027-02-11T23:59:00-05:00',
    });
    expect(rows[22].recordatorio).toBeNull(); // no se hereda una fecha interna de otra actividad
  });
  it('resuelve encabezados reordenados por bloque y admite seriales Excel y fechas con formato', () => {
    const sheets = calendarTestSheets();
    for (let i = 29; i <= 50; i++)
      [sheets[1].data[i][0], sheets[1].data[i][2]] = [sheets[1].data[i][2], sheets[1].data[i][0]];
    sheets[0].data[2][4] = 46398;
    sheets[0].data[2][5] = new Date('2027-02-11T00:00:00Z');
    sheets[0].data[2][6] = new Date('1899-12-30T23:59:00Z');
    sheets[0].data[2][8] = 1439 / 1440;
    const result = parseCalendarSheets(sheets, 'p02');
    expect(result.errors).toEqual([]);
    if (result.batch?.tipo !== 'calendario') throw new Error('Calendario requerido');
    expect(result.batch.programacion![0].apertura).toBe('2027-01-11T00:00:00-05:00');
    expect(result.batch.programacion![42].unidad).toBe('u01');
  });
  it('rechaza un encabezado del segundo bloque sin reutilizar el del primero', () => {
    const sheets = calendarTestSheets();
    sheets[1].data[29][4] = 'ENTREGA';
    const result = parseCalendarSheets(sheets, 'p02');
    expect(result.batch).toBeNull();
    expect(result.errors).toContainEqual({
      hoja: sheets[1].sheet,
      fila: 30,
      motivo: 'Falta o se duplica el encabezado CIERRE.',
    });
  });
  it('no atribuye un bloque de una sola modalidad a las otras modalidades', () => {
    const sheets = calendarTestSheets();
    sheets[1].data[28][0] = String(sheets[1].data[28][0]).replace(
      'EJECUTIVA, VIRTUAL Y POSGRADO',
      'VIRTUAL',
    );
    const result = parseCalendarSheets(sheets, 'p02');
    expect(result.batch).toBeNull();
    expect(result.errors).toContainEqual({
      hoja: sheets[1].sheet,
      fila: 29,
      motivo:
        'El título debe identificar Ejecutiva, Virtual y Posgrado; no se infieren modalidades faltantes.',
    });
  });
  it.each(['30/02/2027', '2027-04-31', '03/04/27', '2026-02-10'])(
    'rechaza fecha %s con pestaña y fila',
    (value) => {
      const sheets = calendarTestSheets();
      sheets[1].data[30][4] = value;
      const result = parseCalendarSheets(sheets, 'p02');
      expect(result.batch).toBeNull();
      expect(result.errors.some((e) => e.hoja === sheets[1].sheet && e.fila === 31)).toBe(true);
    },
  );
  it('rechaza hora inválida, orden inverso, ciclo distinto, duplicados y ausencia de bloque', () => {
    for (const edit of [
      (s: ReturnType<typeof calendarTestSheets>) => {
        s[0].data[2][6] = '25:00';
      },
      (s: ReturnType<typeof calendarTestSheets>) => {
        s[0].data[2][4] = '2027-04-01';
      },
      (s: ReturnType<typeof calendarTestSheets>) => {
        s[0].data.push(s[0].data[2]);
      },
      (s: ReturnType<typeof calendarTestSheets>) => {
        s[1].data.splice(53);
      },
    ]) {
      const sheets = calendarTestSheets();
      edit(sheets);
      expect(parseCalendarSheets(sheets, 'p02').batch).toBeNull();
    }
    expect(parseCalendarSheets(calendarTestSheets(), 'p01').batch).toBeNull();
  });
  it('no rellena unidades entre módulos y rechaza archivos incompletos', () => {
    const sheets = calendarTestSheets();
    sheets[1].data[30][0] = null;
    expect(parseCalendarSheets(sheets, 'p02').batch).toBeNull();
    const truncated = calendarTestSheets();
    truncated[1].data.splice(75);
    expect(parseCalendarSheets(truncated, 'p02').batch).toBeNull();
  });
  it('filtra por modalidad/unidad/tipo, no mezcla ciclos ni convierte el calendario en entregas', () => {
    const batch = parseCalendarSheets(calendarTestSheets(), 'p02').batch!;
    const context = { ...TEACHER_CONTEXT, periodo: 'p02' };
    const report = selectReport([batch], context);
    expect(report.schedule).toHaveLength(84);
    expect(report.needsLinking).toBe(true);
    expect(report.counts.pairs).toBe(0);
    expect(report.complete).toBe(false);
    expect(report.missingSources).toEqual(['spai', 'calificaciones']);
    const withSources = selectReport(
      [
        batch,
        sampleBatch('spai', 'p02'),
        sampleBatch('calificaciones', 'p02'),
        sampleBatch('bajas', 'p02'),
      ],
      context,
    );
    expect(withSources.missingSources).toEqual([]);
    expect(withSources.needsLinking).toBe(true);
    expect(withSources.complete).toBe(false);
    expect(withSources.records).toEqual([]);
    expect(
      selectReport([batch], { ...context, modalidad: 'virtual', unidad: 'u07', tipo: 'foro' })
        .schedule,
    ).toHaveLength(3);
    expect(selectReport([batch], { ...context, periodo: 'p01' }).schedule).toEqual([]);
    expect(selectReport([batch], { ...context, grupo: 'g01' }).schedule).toEqual([]);
  });
  it('revalida al activar y restaurar; un reemplazo rechazado conserva la versión por ciclo', async () => {
    sessionStorage.clear();
    const snapshot = await firstValueFrom(new DemoData().query(TEACHER_CONTEXT));
    TestBed.configureTestingModule({
      providers: [
        { provide: ACADEMIC_DATA, useValue: { query: () => of(snapshot) } },
        { provide: NavigationContext, useValue: { profile: signal('sistemas') } },
      ],
    });
    const store = TestBed.inject(CycleInputStore);
    const batch = parseCalendarSheets(calendarTestSheets(), 'p02').batch!;
    const text = JSON.stringify(batch),
      original = store.version('calendario', 'p01');
    expect(store.activate('calendario', 'p02', text, 'piloto.xlsx')).toBeNull();
    expect(store.version('calendario', 'p02')?.version).toBe(1);
    const invalid = text.replace('2027-01-12T00:00:00-05:00', '2027-02-30T00:00:00-05:00');
    expect(validateInput(invalid, 'calendario', 'p02').batch).toBeNull();
    expect(store.activate('calendario', 'p02', invalid, 'rechazo.xlsx')).toContain('inválida');
    expect(store.version('calendario', 'p02')?.filename).toBe('piloto.xlsx');
    expect(store.version('calendario', 'p01')).toEqual(original);
    const restored = TestBed.runInInjectionContext(() => new CycleInputStore());
    expect(restored.version('calendario', 'p02')?.batch).toEqual(batch);
    sessionStorage.clear();
  });
});

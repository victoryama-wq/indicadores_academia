import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { DemoData } from '../demo-data';
import { ACADEMIC_DATA, DEFAULT_CONTEXT, TEACHER_CONTEXT, Snapshot } from '../models';
import { NavigationContext } from '../navigation-context';
import { CycleInputStore } from './cycle-input-store';
import { validateInput, validDate } from './input-validation';
import { demoCalendar, sampleBatch, seedBatches } from './report-fixtures';
import { INPUT_TYPES, InputBatch } from './report-models';
import { classifyDelivery, reportCut, selectReport } from './report-selectors';

describe('Contrato de insumos ficticios', () => {
  it('valida las cuatro plantillas en ambos ciclos y admite un libro con cero', () => {
    for (const cycle of ['p01', 'p02'])
      for (const type of INPUT_TYPES) {
        const batch = sampleBatch(type, cycle);
        expect(validateInput(JSON.stringify(batch), type, cycle).errors).toEqual([]);
      }
  });
  it('rechaza duplicados, campos ausentes y ciclos cruzados con número de fila', () => {
    const batch = sampleBatch('spai', 'p02');
    if (batch.tipo !== 'spai') throw new Error('Plantilla incorrecta');
    batch.filas.push(batch.filas[0]);
    const result = validateInput(JSON.stringify(batch), 'spai', 'p02');
    expect(result.batch).toBeNull();
    expect(result.errors).toContainEqual({
      fila: 2,
      motivo: 'Registro duplicado dentro del archivo.',
    });
    const incomplete = { ...batch, filas: [{ ciclo: 'p01', cursoId: 'curso' }] };
    const errors = validateInput(JSON.stringify(incomplete), 'spai', 'p02').errors;
    expect(errors).toContainEqual({ fila: 1, motivo: 'Falta el campo obligatorio estudianteId.' });
    expect(errors).toContainEqual({ fila: 1, motivo: 'La fila pertenece a otro ciclo.' });
    expect(validateInput(JSON.stringify(batch), 'spai', 'p01').errors[0].fila).toBe(0);
  });
  it('valida fechas reales, orden e intervalo del ciclo', () => {
    for (const date of ['2027-02-30T12:00:00-05:00', '2027-03-04', '2027-03-01T24:00:00Z'])
      expect(validDate(date)).toBe(false);
    const a = demoCalendar('p02');
    a.apertura = '2027-03-06T12:00:00-05:00';
    a.recordarmeCalificar = '2026-11-01T12:00:00-05:00';
    const result = validateInput(
      JSON.stringify({ schemaVersion: 1, tipo: 'calendario', ciclo: 'p02', filas: [a] }),
      'calendario',
      'p02',
    );
    expect(result.errors.map((e) => e.motivo)).toContain(
      'apertura debe ser anterior o igual a corte.',
    );
    expect(result.errors.some((e) => e.motivo.includes('fuera del intervalo'))).toBe(true);
  });
  it('impide identidades contradictorias y pesos inconsistentes', () => {
    const a = demoCalendar('p02');
    const b = { ...a, actividadId: 'otra', pesoTarea: 60 };
    const errors = validateInput(
      JSON.stringify({ schemaVersion: 1, tipo: 'calendario', ciclo: 'p02', filas: [a, b] }),
      'calendario',
      'p02',
    ).errors;
    expect(errors.some((e) => e.motivo.includes('sumar 100%'))).toBe(true);
    expect(errors.some((e) => e.motivo.includes('contradictorios'))).toBe(true);
    const roster = sampleBatch('spai', 'p02');
    if (roster.tipo !== 'spai') throw new Error('Plantilla incorrecta');
    roster.filas.push({ ...roster.filas[0], estudianteId: 'otro' });
    expect(
      validateInput(JSON.stringify(roster), 'spai', 'p02').errors.some((e) =>
        e.motivo.includes('más de un estudiante'),
      ),
    ).toBe(true);
  });
  it('admite calendario sin criterio pero no calificaciones sin evidencia temporal', () => {
    const a = { ...demoCalendar('p02'), apertura: null, corte: null };
    expect(
      validateInput(
        JSON.stringify({ schemaVersion: 1, tipo: 'calendario', ciclo: 'p02', filas: [a] }),
        'calendario',
        'p02',
      ).errors,
    ).toEqual([]);
    const book = sampleBatch('calificaciones', 'p02');
    if (book.tipo !== 'calificaciones') throw new Error('Plantilla incorrecta');
    book.filas[0].entregaEn = null;
    expect(validateInput(JSON.stringify(book), 'calificaciones', 'p02').batch).toBeNull();
  });
});

describe('Consultas por ciclo y unidades de conteo', () => {
  let batches: InputBatch[];
  beforeAll(async () => {
    batches = seedBatches(await firstValueFrom(new DemoData().query(TEACHER_CONTEXT)));
  });
  it.each(['ejecutiva', 'virtual', 'posgrados'])(
    'respeta apertura y cierre exacto de %s sin usar el recordatorio',
    (modalidad) => {
      const a = { ...demoCalendar('p02'), modalidad };
      const close = Date.parse(a.corte!);
      expect(classifyDelivery(a, new Date(close - 1000).toISOString())).toBe('en-tiempo');
      expect(classifyDelivery(a, a.corte)).toBe('en-tiempo');
      expect(classifyDelivery(a, new Date(close + 1000).toISOString())).toBe('extemporanea');
      expect(classifyDelivery(a, new Date(Date.parse(a.apertura!) - 1000).toISOString())).toBe(
        'sin-criterio',
      );
      expect(classifyDelivery(a, a.apertura)).toBe('en-tiempo');
      for (const recordarmeCalificar of [null, a.apertura, '2027-03-20T08:00:00-05:00']) {
        expect(classifyDelivery({ ...a, recordarmeCalificar }, a.corte)).toBe('en-tiempo');
        expect(
          classifyDelivery({ ...a, recordarmeCalificar }, new Date(close + 1000).toISOString()),
        ).toBe('extemporanea');
      }
    },
  );
  it('Escolarizada distingue el instante de entrega del corte posterior', () => {
    const a = {
      ...demoCalendar('p02'),
      modalidad: 'escolarizada',
      entrega: '2027-03-03T23:59:00-05:00',
    };
    const due = Date.parse(a.entrega);
    expect(classifyDelivery(a, new Date(due - 1000).toISOString())).toBe('en-tiempo');
    expect(classifyDelivery(a, a.entrega)).toBe('en-tiempo');
    expect(classifyDelivery(a, new Date(due + 1000).toISOString())).toBe('extemporanea');
    for (const seconds of [-1, 0, 1]) {
      expect(
        classifyDelivery(a, new Date(Date.parse(a.corte!) + seconds * 1000).toISOString()),
      ).toBe('extemporanea');
    }
    expect(classifyDelivery({ ...a, entrega: null }, a.corte)).toBe('sin-criterio');
  });
  it('el corte de consulta incluye el instante exacto y excluye evidencia posterior', () => {
    const calendar = sampleBatch('calendario', 'p02');
    const roster = sampleBatch('spai', 'p02');
    const book = sampleBatch('calificaciones', 'p02');
    if (book.tipo !== 'calificaciones') throw new Error('Plantilla incorrecta');
    const cut = Date.parse(reportCut('p02'));
    for (const seconds of [-1, 0, 1]) {
      const instant = new Date(cut + seconds * 1000).toISOString();
      book.filas[0].entregaEn = instant;
      book.filas[0].calificadaEn = instant;
      const report = selectReport([calendar, roster, book], { ...TEACHER_CONTEXT, periodo: 'p02' });
      expect(report.counts.graded).toBe(seconds <= 0 ? 1 : 0);
      expect(report.counts.missing).toBe(seconds > 0 ? 1 : 0);
    }
  });
  it('el conjunto precargado también cumple el contrato de carga', () => {
    for (const batch of batches)
      expect(validateInput(JSON.stringify(batch), batch.tipo, batch.ciclo).errors).toEqual([]);
  });
  it('distingue personas de pares y conserva los seis pendientes originales', () => {
    const original = selectReport(batches, DEFAULT_CONTEXT);
    expect(original.counts).toMatchObject({
      students: 30,
      pairs: 30,
      graded: 18,
      pending: 6,
      missing: 6,
    });
    const all = selectReport(batches, TEACHER_CONTEXT);
    expect(all.counts).toMatchObject({
      students: 38,
      pairs: 54,
      graded: 31,
      pending: 17,
      missing: 6,
    });
    expect(all.students).toHaveLength(24);
    expect(all.students.find((s) => s.estudianteId === 'rep-e01')?.tasks).toBe(2);
    expect(all.teachers.find((t) => t.id === 'd04')).toMatchObject({
      students: 2,
      graded: 6,
      pending: 6,
    });
    expect(all.teachers.some((t) => t.id === 'd03')).toBe(false);
  });
  it('filtra tipo, unidad, modalidad y entregas extemporáneas sin mezclar docentes', () => {
    const result = selectReport(
      batches,
      { ...TEACHER_CONTEXT, modalidad: 'ejecutiva', tipo: 'integradora', unidad: 'u02' },
      'extemporanea',
    );
    expect(result.counts).toMatchObject({ students: 1, pairs: 1, graded: 0, pending: 1, late: 1 });
    expect(result.teachers.map((t) => t.id)).toEqual(['d04']);
    expect(selectReport(batches, { ...TEACHER_CONTEXT, grupo: 'inexistente' }).counts.pairs).toBe(
      0,
    );
  });
  it('no usa insumos de otro ciclo, admite calendario solo y no inventa ausencia de entrega', () => {
    const p02 = { ...TEACHER_CONTEXT, periodo: 'p02' };
    expect(selectReport(batches, p02).records).toEqual([]);
    const calendar = sampleBatch('calendario', 'p02');
    const partial = selectReport([...batches, calendar], p02);
    expect(partial.calendar).toHaveLength(1);
    expect(partial.missingSources).toEqual(['spai', 'calificaciones']);
    const result = selectReport(
      [...batches, calendar, sampleBatch('spai', 'p02'), sampleBatch('calificaciones', 'p02')],
      p02,
    );
    expect(result.counts).toMatchObject({ students: 1, pairs: 1, graded: 1, pending: 0 });
    expect(result.records[0].grade).toBe(0);
    const unknown = selectReport([calendar, sampleBatch('spai', 'p02')], p02);
    expect(unknown.counts).toMatchObject({ unknown: 1, missing: 0 });
  });
  it('aplica bajas al corte fijo y pone en evidencia cruces huérfanos', () => {
    const p02 = { ...TEACHER_CONTEXT, periodo: 'p02' };
    const inputs = INPUT_TYPES.map((t) => sampleBatch(t, 'p02'));
    expect(selectReport(inputs, p02).excluded).toBe(1);
    expect(selectReport(inputs, p02).counts.pairs).toBe(0);
    const book = inputs.find((b) => b.tipo === 'calificaciones')!;
    book.filas[0].actividadId = 'otra-actividad';
    const result = selectReport(
      inputs.filter((b) => b.tipo !== 'bajas'),
      p02,
    );
    expect(result.issues).toContain(
      'Libro, fila 1: actividad o inscripción sin correspondencia; no se cruza.',
    );
    expect(result.counts).toMatchObject({ graded: 0, unknown: 1 });
    expect(result.complete).toBe(false);
  });
  it('separa cierre de recordatorio y exige criterios explícitos para cada modalidad', () => {
    const a = demoCalendar('p01');
    for (const modalidad of ['ejecutiva', 'virtual', 'posgrados']) {
      expect(classifyDelivery({ ...a, modalidad }, '2026-11-04T12:00:00-05:00')).toBe('en-tiempo');
      expect(classifyDelivery({ ...a, modalidad }, '2026-11-06T12:00:00-05:00')).toBe(
        'extemporanea',
      );
    }
    expect(
      classifyDelivery(
        { ...a, modalidad: 'escolarizada', entrega: '2026-11-03T12:00:00-05:00' },
        '2026-11-04T12:00:00-05:00',
      ),
    ).toBe('extemporanea');
    for (const altered of [
      { ...a, modalidad: 'mixta' },
      { ...a, apertura: null },
      { ...a, propedeutico: true },
    ])
      expect(classifyDelivery(altered, '2026-11-04T12:00:00-05:00')).toBe('sin-criterio');
  });
});

describe('Activación local por tipo y ciclo', () => {
  let snapshot: Snapshot;
  const profile = signal('sistemas');
  beforeAll(async () => {
    snapshot = await firstValueFrom(new DemoData().query(TEACHER_CONTEXT));
  });
  beforeEach(() => {
    sessionStorage.clear();
    profile.set('sistemas');
    TestBed.configureTestingModule({
      providers: [
        { provide: ACADEMIC_DATA, useValue: { query: () => of(snapshot) } },
        { provide: NavigationContext, useValue: { profile } },
      ],
    });
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it('activa solo el tipo/ciclo elegido, conserva la versión anterior ante rechazo y persiste recargas', () => {
    const store = TestBed.inject(CycleInputStore);
    const original = store.version('calendario', 'p01');
    const valid = JSON.stringify(sampleBatch('calendario', 'p02'));
    expect(store.activate('calendario', 'p02', valid, 'calendario.json')).toBeNull();
    expect(store.version('calendario', 'p02')?.version).toBe(1);
    expect(store.version('spai', 'p02')).toBeNull();
    expect(store.activate('calendario', 'p02', '{}', 'invalido.json')).toContain('inválida');
    expect(store.version('calendario', 'p02')?.version).toBe(1);
    expect(store.version('calendario', 'p01')).toEqual(original);
    const reloaded = TestBed.runInInjectionContext(() => new CycleInputStore());
    expect(reloaded.version('calendario', 'p02')?.filename).toBe('calendario.json');
    expect(store.activate('calendario', 'p02', valid, 'v2.json')).toBeNull();
    expect(store.version('calendario', 'p02')?.version).toBe(2);
  });
  it('rechaza activación de otro perfil y un fallo de persistencia no cambia la versión', () => {
    const store = TestBed.inject(CycleInputStore);
    const text = JSON.stringify(sampleBatch('spai', 'p02'));
    profile.set('coordinacion');
    expect(store.activate('spai', 'p02', text, 'spai.json')).toContain('Sistemas');
    profile.set('sistemas');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(store.activate('spai', 'p02', text, 'spai.json')).toContain('No se pudo guardar');
    expect(store.version('spai', 'p02')).toBeNull();
  });
});

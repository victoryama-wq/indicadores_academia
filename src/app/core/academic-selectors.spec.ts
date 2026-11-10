import { firstValueFrom } from 'rxjs';
import { DemoData } from './demo-data';
import { countRecords, TEACHER_CONTEXT } from './models';
import { subjectRows, teacherRows } from './academic-selectors';

describe('Consulta docente: unidades y aislamiento de datos', () => {
  const source = new DemoData();
  it('mantiene pares únicos y deduplica personas entre actividades y docentes', async () => {
    const data = await firstValueFrom(source.query(TEACHER_CONTEXT));
    expect(new Set(data.records.map((r) => r.studentId + ':' + r.activityId)).size).toBe(
      data.records.length,
    );
    expect(countRecords(data.records)).toEqual({
      students: 36,
      expected: 42,
      received: 36,
      graded: 25,
      pending: 11,
      missing: 6,
      overdue: 7,
      within: 4,
    });
    const rows = teacherRows(data);
    expect(rows.map((t) => t.id)).toEqual(['d01', 'd02', 'd03']);
    expect(rows[0].counts).toEqual({
      students: 31,
      expected: 36,
      received: 30,
      graded: 21,
      pending: 9,
      missing: 6,
      overdue: 6,
      within: 3,
    });
    expect(rows[0].subjects.map((s) => s.id)).toEqual(['i01', 'i02']);
    expect(rows[0].groups.map((g) => g.id)).toEqual(['g01', 'g02']);
    expect(rows[1].counts).toEqual({
      students: 4,
      expected: 4,
      received: 4,
      graded: 2,
      pending: 2,
      missing: 0,
      overdue: 1,
      within: 1,
    });
    expect(rows[2].counts.pending).toBe(0);
    expect(rows[2].counts.graded).toBe(2);
    expect(rows.reduce((sum, t) => sum + t.counts.students, 0)).toBe(37); // No sumar personas entre responsables.
    expect(rows[0].records.some((r) => rows[1].records.some((other) => other.id === r.id))).toBe(
      false,
    );
  });
  it('calcula cada fila de impartición y actividad, nunca reutiliza el total global', async () => {
    const data = await firstValueFrom(source.query({ ...TEACHER_CONTEXT, grupo: 'g02' }));
    const rows = subjectRows(data);
    expect(rows.map((s) => [s.id, s.counts.expected, s.counts.graded, s.counts.pending])).toEqual([
      ['i02', 6, 3, 3],
      ['i03', 4, 2, 2],
    ]);
    expect(rows[0].activities.map((a) => [a.id, a.counts.graded, a.counts.pending])).toEqual([
      ['a02', 1, 2],
      ['a03', 2, 1],
    ]);
    expect(teacherRows(data)[0].counts.students).toBe(3);
  });
  it('aplica todos los filtros antes de agrupar por docente', async () => {
    const context = {
      ...TEACHER_CONTEXT,
      carrera: 'enf',
      modalidad: 'escolarizada',
      grupo: 'g02',
      asignatura: 'i03',
      docente: 'd02',
    };
    const data = await firstValueFrom(source.query(context));
    expect(teacherRows(data).map((t) => [t.id, t.counts.pending])).toEqual([['d02', 2]]);
    expect(data.records.every((r) => r.activityId === 'a04')).toBe(true);
    const mismatch = await firstValueFrom(source.query({ ...context, docente: 'd01' }));
    expect(teacherRows(mismatch)).toEqual([]);
    expect(mismatch.records).toEqual([]);
    expect(mismatch.catalog.teachers.some((t) => t.id === 'd01')).toBe(true);
  });
  it('distingue un docente sin pendientes, selección vacía y corte incompleto', async () => {
    const zero = await firstValueFrom(
      source.query({ ...TEACHER_CONTEXT, carrera: 'adm', modalidad: 'mixta' }),
    );
    expect(teacherRows(zero).map((t) => [t.id, t.counts.pending])).toEqual([['d03', 0]]);
    const empty = await firstValueFrom(source.query({ ...TEACHER_CONTEXT, periodo: 'p02' }));
    expect(empty.status).toBe('complete');
    expect(teacherRows(empty)).toEqual([]);
    const incomplete = await firstValueFrom(source.query({ ...TEACHER_CONTEXT, corte: 'c00' }));
    expect(incomplete.status).toBe('incomplete');
    expect(incomplete.records).toEqual([]);
    expect(teacherRows(incomplete)).toHaveLength(3);
  });
});

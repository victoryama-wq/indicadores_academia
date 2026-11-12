import { AcademicCatalog, QueryContext } from '../models';
import {
  ACTIVITY_TYPES,
  CalendarRow,
  InputBatch,
  LateState,
  REPORT_AS_OF,
  ReportRecord,
} from './report-models';

export function reportCut(cycle: string) {
  return cycle === 'p02' ? '2027-03-06T23:59:00-05:00' : REPORT_AS_OF;
}
export function classifyDelivery(a: CalendarRow, submitted: string | null): LateState {
  if (!submitted) return 'sin-entrega';
  if (!a.apertura || !a.corte || a.propedeutico || Date.parse(submitted) < Date.parse(a.apertura))
    return 'sin-criterio';
  const boundary =
    a.modalidad === 'escolarizada'
      ? a.entrega
      : ['ejecutiva', 'virtual', 'posgrados'].includes(a.modalidad)
        ? a.corte
        : null;
  if (!boundary) return 'sin-criterio';
  return Date.parse(submitted) > Date.parse(boundary) ? 'extemporanea' : 'en-tiempo';
}
export function reportCatalog(calendar: readonly CalendarRow[]): AcademicCatalog {
  return {
    groups: [
      ...new Map(
        calendar.map((a) => [
          a.grupoId,
          {
            id: a.grupoId,
            name: a.grupo,
            program: a.carrera,
            modality: a.modalidad,
            periodId: a.ciclo,
            programId: a.carreraId,
            modalityId: a.modalidad,
          },
        ]),
      ).values(),
    ],
    subjects: [
      ...new Map(
        calendar.map((a) => [
          a.cursoId,
          {
            id: a.cursoId,
            groupId: a.grupoId,
            name: a.asignatura,
            code: a.cursoId,
            teacher: a.docente,
            teacherId: a.docenteId,
          },
        ]),
      ).values(),
    ],
    teachers: [
      ...new Map(calendar.map((a) => [a.docenteId, { id: a.docenteId, name: a.docente }])).values(),
    ],
  };
}
export function selectReport(
  batches: readonly InputBatch[],
  context: QueryContext,
  late = 'todas',
) {
  const sources = batches.filter((b) => b.ciclo === context.periodo);
  const allCalendar = sources.find((b) => b.tipo === 'calendario')?.filas ?? [];
  const roster = sources.find((b) => b.tipo === 'spai')?.filas ?? [];
  const grades = sources.find((b) => b.tipo === 'calificaciones')?.filas ?? [];
  const withdrawals = sources.find((b) => b.tipo === 'bajas')?.filas ?? [];
  const asOf = Date.parse(reportCut(context.periodo));
  const calendar = allCalendar.filter(
    (a) =>
      a.ciclo === context.periodo &&
      (context.carrera === 'todas' || context.carrera === a.carreraId) &&
      (context.modalidad === 'todas' || context.modalidad === a.modalidad) &&
      (context.grupo === 'todos' || context.grupo === a.grupoId) &&
      (context.docente === 'todos' || context.docente === a.docenteId) &&
      (context.asignatura === 'todas' || context.asignatura === a.cursoId) &&
      (context.tipo === 'todos' || context.tipo === a.tipo) &&
      (context.unidad === 'todas' || context.unidad === a.unidad),
  );
  const required = ['calendario', 'spai', 'calificaciones'] as const;
  const missingSources = required.filter((t) => !sources.some((b) => b.tipo === t));
  const issues: string[] = [];
  roster.forEach((s, i) => {
    if (!allCalendar.some((a) => a.cursoId === s.cursoId))
      issues.push(`SPAI, fila ${i + 1}: curso sin calendario; no se cruza.`);
  });
  grades.forEach((g, i) => {
    if (
      !allCalendar.some((a) => a.cursoId === g.cursoId && a.actividadId === g.actividadId) ||
      !roster.some((s) => s.cursoId === g.cursoId && s.estudianteId === g.estudianteId)
    )
      issues.push(
        `Libro, fila ${i + 1}: actividad o inscripción sin correspondencia; no se cruza.`,
      );
  });
  withdrawals.forEach((w, i) => {
    if (!roster.some((s) => s.cursoId === w.cursoId && s.estudianteId === w.estudianteId))
      issues.push(`Bajas, fila ${i + 1}: inscripción sin correspondencia; no se aplica.`);
  });
  const records: ReportRecord[] = [];
  let excluded = 0;
  for (const a of calendar)
    for (const student of roster.filter(
      (s) => s.cursoId === a.cursoId && s.ciclo === context.periodo,
    )) {
      if (
        withdrawals.some(
          (w) =>
            w.cursoId === a.cursoId &&
            w.estudianteId === student.estudianteId &&
            w.ciclo === context.periodo &&
            Date.parse(w.fechaBaja) <= asOf,
        )
      ) {
        excluded++;
        continue;
      }
      const grade = grades.find(
        (g) =>
          g.cursoId === a.cursoId &&
          g.actividadId === a.actividadId &&
          g.estudianteId === student.estudianteId &&
          g.ciclo === context.periodo,
      );
      const submitted =
        grade?.entregaEn && Date.parse(grade.entregaEn) <= asOf ? grade.entregaEn : null;
      const state = !grade
        ? 'sin-datos'
        : !submitted
          ? 'sin-entrega'
          : grade.calificacion !== null &&
              grade.calificadaEn &&
              Date.parse(grade.calificadaEn) <= asOf
            ? 'calificada'
            : 'pendiente';
      records.push({
        calendar: a,
        student,
        state,
        submittedAt: submitted,
        grade: state === 'calificada' ? (grade?.calificacion ?? null) : null,
        late: state === 'sin-datos' ? 'sin-criterio' : classifyDelivery(a, submitted),
      });
    }
  const filtered = records.filter((r) => late === 'todas' || r.late === late);
  const students = [
    ...new Map(
      filtered
        .filter((r) => r.calendar.tipo === 'tarea' && r.state === 'calificada')
        .map((r) => [r.student.estudianteId, r.student]),
    ).values(),
  ].map((s) => ({
    ...s,
    tasks: filtered.filter(
      (r) =>
        r.student.estudianteId === s.estudianteId &&
        r.calendar.tipo === 'tarea' &&
        r.state === 'calificada',
    ).length,
  }));
  const count = (rows: readonly ReportRecord[]) => {
    const graded = rows.filter((r) => r.state === 'calificada').length;
    const pending = rows.filter((r) => r.state === 'pendiente').length;
    return {
      students: new Set(rows.map((r) => r.student.estudianteId)).size,
      pairs: rows.length,
      graded,
      pending,
      missing: rows.filter((r) => r.state === 'sin-entrega').length,
      unknown: rows.filter((r) => r.state === 'sin-datos').length,
      late: rows.filter((r) => r.late === 'extemporanea').length,
      noRule: rows.filter((r) => r.late === 'sin-criterio').length,
      progress: graded + pending ? Math.round((graded * 100) / (graded + pending)) : null,
    };
  };
  return {
    calendar,
    catalog: reportCatalog(allCalendar),
    records: filtered,
    students,
    counts: count(filtered),
    missingSources,
    issues,
    excluded,
    complete:
      !missingSources.length && !issues.length && !records.some((r) => r.state === 'sin-datos'),
    types: ACTIVITY_TYPES.map((type) => ({
      type,
      ...count(filtered.filter((r) => r.calendar.tipo === type)),
    })),
    activities: calendar.map((a) => ({ ...a, ...count(filtered.filter((r) => r.calendar === a)) })),
    teachers: [
      ...new Map(
        filtered
          .filter((r) => r.state === 'pendiente')
          .map((r) => [r.calendar.docenteId, r.calendar.docente]),
      ).entries(),
    ].map(([id, name]) => ({
      id,
      name,
      ...count(filtered.filter((r) => r.calendar.docenteId === id)),
      courses: [
        ...new Set(
          filtered
            .filter((r) => r.calendar.docenteId === id)
            .map((r) => r.calendar.asignatura + ' · ' + r.calendar.grupo),
        ),
      ],
    })),
  };
}

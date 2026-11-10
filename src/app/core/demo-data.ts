import { Injectable } from '@angular/core';
import { defer, delay, of, throwError } from 'rxjs';
import {
  AcademicDataSource,
  Activity,
  Group,
  QueryContext,
  Snapshot,
  Subject,
  TrackingRecord,
} from './models';

const groups: readonly Group[] = [
  {
    id: 'g01',
    name: 'ENF-301',
    program: 'Licenciatura en Enfermería',
    modality: 'Escolarizada',
    periodId: 'p01',
    programId: 'enf',
    modalityId: 'escolarizada',
  },
  {
    id: 'g02',
    name: 'ENF-401',
    program: 'Licenciatura en Enfermería',
    modality: 'Escolarizada',
    periodId: 'p01',
    programId: 'enf',
    modalityId: 'escolarizada',
  },
  {
    id: 'g03',
    name: 'ADM-201',
    program: 'Licenciatura en Administración',
    modality: 'Mixta',
    periodId: 'p01',
    programId: 'adm',
    modalityId: 'mixta',
  },
];
const subjects: readonly Subject[] = [
  {
    id: 'i01',
    groupId: 'g01',
    name: 'Enfermería Clínica',
    code: 'ENF-304',
    teacher: 'Docente Demo A',
    teacherId: 'd01',
  },
  {
    id: 'i02',
    groupId: 'g02',
    name: 'Salud Comunitaria',
    code: 'ENF-402',
    teacher: 'Docente Demo A',
    teacherId: 'd01',
  },
  {
    id: 'i03',
    groupId: 'g02',
    name: 'Farmacología',
    code: 'ENF-403',
    teacher: 'Docente Demo B',
    teacherId: 'd02',
  },
  {
    id: 'i04',
    groupId: 'g03',
    name: 'Administración I',
    code: 'ADM-201',
    teacher: 'Docente Demo C',
    teacherId: 'd03',
  },
];
const activities: readonly Activity[] = [
  {
    id: 'a01',
    subjectId: 'i01',
    name: 'Plan de cuidados',
    type: 'Tarea',
    unit: 'Unidad 1',
    dueAt: '2026-11-03T23:59:00-05:00',
  },
  ...[
    { id: 'a02', subjectId: 'i02', name: 'Diagnóstico comunitario' },
    { id: 'a03', subjectId: 'i02', name: 'Plan de intervención' },
    { id: 'a04', subjectId: 'i03', name: 'Ficha farmacológica' },
    { id: 'a05', subjectId: 'i04', name: 'Proceso administrativo' },
  ].map((activity) => ({
    ...activity,
    type: 'Tarea',
    unit: 'Unidad 1',
    dueAt: '2026-11-03T23:59:00-05:00',
  })),
];
const originalRecords: readonly TrackingRecord[] = Array.from({ length: 30 }, (_, index) => {
  const n = index + 1;
  const suffix = String(n).padStart(3, '0');
  return {
    id: `r${suffix}`,
    activityId: 'a01',
    studentId: `e${suffix}`,
    studentName: `Estudiante Demo ${suffix}`,
    registration: `DEMO-${suffix}`,
    state: n <= 18 ? 'calificada' : n <= 24 ? 'pendiente' : 'sin-entrega',
    deadlineState: n >= 19 && n <= 22 ? 'vencido' : n === 23 || n === 24 ? 'en-plazo' : null,
    submittedAt: n <= 24 ? '2026-11-03T14:20:00-05:00' : null,
    grade: n <= 18 ? (n === 1 ? 0 : 85) : null,
    gradingDueAt:
      n <= 24 ? (n <= 22 ? '2026-11-05T23:59:00-05:00' : '2026-11-09T23:59:00-05:00') : null,
  };
});

// Una fila por estudiante y actividad; las mismas personas participan en varias actividades.
function record(
  activityId: string,
  student: number,
  state: TrackingRecord['state'],
  deadlineState: TrackingRecord['deadlineState'] = null,
): TrackingRecord {
  const suffix = String(student).padStart(3, '0');
  return {
    id: `${activityId}-e${suffix}`,
    activityId,
    studentId: `e${suffix}`,
    studentName: `Estudiante Demo ${suffix}`,
    registration: `DEMO-${suffix}`,
    state,
    deadlineState,
    submittedAt: '2026-11-03T14:20:00-05:00',
    grade: state === 'calificada' ? 85 : null,
    gradingDueAt:
      deadlineState === 'en-plazo' ? '2026-11-09T23:59:00-05:00' : '2026-11-05T23:59:00-05:00',
  };
}
const records: readonly TrackingRecord[] = [
  ...originalRecords,
  record('a02', 19, 'pendiente', 'vencido'),
  record('a02', 23, 'pendiente', 'en-plazo'),
  record('a02', 31, 'calificada'),
  record('a03', 19, 'pendiente', 'vencido'),
  record('a03', 23, 'calificada'),
  record('a03', 31, 'calificada'),
  record('a04', 31, 'calificada'),
  record('a04', 32, 'calificada'),
  record('a04', 33, 'pendiente', 'vencido'),
  record('a04', 34, 'pendiente', 'en-plazo'),
  record('a05', 40, 'calificada'),
  record('a05', 41, 'calificada'),
];
const catalog = {
  groups,
  subjects,
  teachers: [
    { id: 'd01', name: 'Docente Demo A' },
    { id: 'd02', name: 'Docente Demo B' },
    { id: 'd03', name: 'Docente Demo C' },
  ],
};

/** Reemplazable por un adaptador remoto. No contiene SDK, credenciales ni tráfico Moodle/Firebase. */
@Injectable({ providedIn: 'root' })
export class DemoData implements AcademicDataSource {
  query(context: QueryContext) {
    return defer(() => {
      if (context.corte === 'error')
        return throwError(() => new Error('Error simulado de consulta'));
      const validPeriod = context.periodo === 'p01';
      const incomplete = validPeriod && context.corte !== 'c01';
      const selectedGroups = groups.filter(
        (g) =>
          g.periodId === context.periodo &&
          (context.carrera === 'todas' || context.carrera === g.programId) &&
          (context.modalidad === 'todas' || context.modalidad === g.modalityId) &&
          (context.grupo === 'todos' || context.grupo === g.id),
      );
      const selectedSubjects = subjects.filter(
        (s) =>
          selectedGroups.some((g) => g.id === s.groupId) &&
          (context.docente === 'todos' || context.docente === s.teacherId) &&
          (context.asignatura === 'todas' || context.asignatura === s.id),
      );
      const selectedActivities = activities.filter(
        (a) =>
          selectedSubjects.some((s) => s.id === a.subjectId) &&
          (context.tipo === 'todos' || context.tipo === 'tarea') &&
          (context.unidad === 'todas' || context.unidad === 'u01'),
      );
      const visibleSubjects = selectedSubjects.filter((s) =>
        selectedActivities.some((a) => a.subjectId === s.id),
      );
      const snapshot: Snapshot = {
        catalog,
        status: incomplete ? 'incomplete' : 'complete',
        groups: selectedGroups.filter((g) => visibleSubjects.some((s) => s.groupId === g.id)),
        subjects: visibleSubjects,
        activities: selectedActivities,
        records: incomplete
          ? []
          : records.filter((r) => selectedActivities.some((a) => a.id === r.activityId)),
        updatedAt: selectedActivities.length && !incomplete ? '2026-11-06T18:00:00-05:00' : null,
      };
      return of(snapshot).pipe(delay(250));
    });
  }
}

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
];
const records: readonly TrackingRecord[] = Array.from({ length: 30 }, (_, index) => {
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

/** Reemplazable por un adaptador remoto. No contiene SDK, credenciales ni tráfico Moodle/Firebase. */
@Injectable({ providedIn: 'root' })
export class DemoData implements AcademicDataSource {
  query(context: QueryContext) {
    return defer(() => {
      if (context.corte === 'error')
        return throwError(() => new Error('Error simulado de consulta'));
      const validPeriod = context.periodo === 'p01';
      const incomplete = validPeriod && context.corte !== 'c01';
      const match =
        validPeriod &&
        (context.carrera === 'enf' || context.carrera === 'todas') &&
        (context.modalidad === 'escolarizada' || context.modalidad === 'todas') &&
        (context.grupo === 'g01' || context.grupo === 'todos') &&
        (context.tipo === 'todos' || context.tipo === 'tarea') &&
        (context.unidad === 'todas' || context.unidad === 'u01') &&
        (context.docente === 'todos' || context.docente === 'd01');
      const snapshot: Snapshot = {
        status: incomplete ? 'incomplete' : 'complete',
        groups: match ? groups : [],
        subjects: match ? subjects : [],
        activities: match ? activities : [],
        records: match && !incomplete ? records : [],
        updatedAt: match && !incomplete ? '2026-11-06T18:00:00-05:00' : null,
      };
      return of(snapshot).pipe(delay(250));
    });
  }
}

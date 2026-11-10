import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

export type Profile = 'coordinacion' | 'direccion' | 'sistemas';
export type RecordState = 'calificada' | 'pendiente' | 'sin-entrega';
export type StateFilter = 'todos' | 'recibida' | RecordState | 'vencido' | 'en-plazo';
export interface QueryContext {
  periodo: string;
  corte: string;
  carrera: string;
  modalidad: string;
  grupo: string;
  tipo: string;
  unidad: string;
  docente: string;
}
export interface Group {
  id: string;
  name: string;
  program: string;
  modality: string;
  periodId: string;
}
export interface Subject {
  id: string;
  groupId: string;
  name: string;
  code: string;
  teacher: string;
  teacherId: string;
}
export interface Activity {
  id: string;
  subjectId: string;
  name: string;
  type: string;
  unit: string;
  dueAt: string;
}
export interface TrackingRecord {
  id: string;
  activityId: string;
  studentId: string;
  studentName: string;
  registration: string;
  state: RecordState;
  deadlineState: 'vencido' | 'en-plazo' | null;
  submittedAt: string | null;
  grade: number | null;
  gradingDueAt: string | null;
}
export interface Snapshot {
  status: 'complete' | 'incomplete';
  groups: readonly Group[];
  subjects: readonly Subject[];
  activities: readonly Activity[];
  records: readonly TrackingRecord[];
  updatedAt: string | null;
}
export interface Counts {
  students: number;
  expected: number;
  received: number;
  graded: number;
  pending: number;
  missing: number;
  overdue: number;
  within: number;
}
export interface AcademicDataSource {
  query(context: QueryContext): Observable<Snapshot>;
}
export const ACADEMIC_DATA = new InjectionToken<AcademicDataSource>('ACADEMIC_DATA');
export const DEFAULT_CONTEXT: QueryContext = {
  periodo: 'p01',
  corte: 'c01',
  carrera: 'enf',
  modalidad: 'escolarizada',
  grupo: 'g01',
  tipo: 'todos',
  unidad: 'todas',
  docente: 'todos',
};
export const STATE_LABELS: Record<StateFilter, string> = {
  todos: 'Todos los registros',
  recibida: 'Entregas recibidas',
  calificada: 'Calificadas',
  pendiente: 'Pendientes de calificar',
  'sin-entrega': 'Sin entrega',
  vencido: 'Pendientes vencidos',
  'en-plazo': 'Pendientes en plazo',
};
export function selectRecords(records: readonly TrackingRecord[], state: string): TrackingRecord[] {
  return records.filter(
    (r) =>
      state === 'todos' ||
      (state === 'recibida'
        ? r.state !== 'sin-entrega'
        : state === 'vencido' || state === 'en-plazo'
          ? r.deadlineState === state
          : r.state === state),
  );
}
export function countRecords(records: readonly TrackingRecord[]): Counts {
  return {
    students: new Set(records.map((r) => r.studentId)).size,
    expected: records.length,
    received: selectRecords(records, 'recibida').length,
    graded: selectRecords(records, 'calificada').length,
    pending: selectRecords(records, 'pendiente').length,
    missing: selectRecords(records, 'sin-entrega').length,
    overdue: selectRecords(records, 'vencido').length,
    within: selectRecords(records, 'en-plazo').length,
  };
}

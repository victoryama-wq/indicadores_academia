import { ReportRecord, TYPE_LABELS } from './report-models';
import { ReportActivity, selectReport } from './report-selectors';

export const queries = [
  { id: 'estudiantes', label: 'Estudiantes con tarea calificada', icon: 'people' },
  { id: 'entregas', label: 'Entregas calificadas y pendientes', icon: 'report' },
  { id: 'docentes', label: 'Docentes con pendientes', icon: 'book' },
] as const;
export type Query = (typeof queries)[number]['id'];
export type Indicator = ReportRecord['state'] | 'personas' | 'recibida';
export interface ResultRow {
  id: string;
  label: string;
  description: string;
  records: readonly ReportRecord[];
}
export const indicators: Record<Indicator, string> = {
  personas: 'Estudiantes únicos',
  recibida: 'Entregas recibidas',
  calificada: 'Calificadas',
  pendiente: 'Pendientes',
  'sin-entrega': 'Sin entrega',
  'sin-datos': 'Sin evidencia',
  borrador: 'Borradores',
};
export const columns: Record<Query, Indicator[]> = {
  estudiantes: ['calificada'],
  docentes: ['personas', 'calificada', 'pendiente'],
  entregas: ['calificada', 'pendiente', 'sin-entrega', 'sin-datos'],
};
export function resultRows(report: ReturnType<typeof selectReport>, query: Query): ResultRow[] {
  if (query === 'docentes')
    return report.teachers.map((t) => ({
      id: 'docente-' + t.id,
      label: t.name,
      description: t.courses.join(' / '),
      records: report.records.filter((r) => r.calendar.docenteId === t.id),
    }));
  if (query === 'estudiantes')
    return report.students.map((s) => ({
      id: 'estudiante-' + s.estudianteId,
      label: s.estudiante,
      description: s.matricula,
      records: report.records.filter(
        (r) =>
          r.student.estudianteId === s.estudianteId &&
          r.state === 'calificada' &&
          r.calendar.tipo === 'tarea',
      ),
    }));
  return report.types.map((t) => ({
    id: 'tipo-' + t.type,
    label: TYPE_LABELS[t.type],
    description: '',
    records: report.records.filter((r) => r.calendar.tipo === t.type),
  }));
}
export function indicatorCount(records: readonly ReportRecord[], key: Indicator) {
  return key === 'personas'
    ? new Set(records.map((r) => r.student.estudianteId)).size
    : records.filter((r) =>
        key === 'recibida' ? r.state === 'calificada' || r.state === 'pendiente' : r.state === key,
      ).length;
}
export function contributions(
  activities: readonly ReportActivity[],
  row: ResultRow,
  key: Indicator,
) {
  const included = new Set(row.records);
  return activities.flatMap((activity) => {
    const rows = activity.rows.filter((r) => included.has(r));
    const count = indicatorCount(rows, key);
    return count ? [{ activity, rows, count }] : [];
  });
}
export type Contribution = ReturnType<typeof contributions>[number];

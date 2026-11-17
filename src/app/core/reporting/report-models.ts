import { CalendarScheduleRow } from './calendar-schedule';

export const CYCLES = [
  { value: 'p01', label: '27-1 · En operación (demo)' },
  { value: 'p02', label: '27-2 · Preparación (demo)' },
] as const;
export const INPUT_TYPES = ['calendario', 'spai', 'bajas', 'calificaciones'] as const;
export type InputType = (typeof INPUT_TYPES)[number];
export const INPUT_LABELS: Record<InputType, string> = {
  calendario: 'Calendario Moodle',
  spai: 'Exportación SPAI',
  bajas: 'Movimientos de bajas',
  calificaciones: 'Libro de calificaciones',
};
export const ACTIVITY_TYPES = ['tarea', 'integradora', 'foro', 'examen'] as const;
export type ReportActivityType = (typeof ACTIVITY_TYPES)[number];
export const TYPE_LABELS: Record<ReportActivityType, string> = {
  tarea: 'Tarea',
  integradora: 'Actividad integradora',
  foro: 'Foro',
  examen: 'Examen',
};
export const MODALITIES = ['escolarizada', 'mixta', 'ejecutiva', 'virtual', 'posgrados'] as const;
export interface CalendarRow {
  ciclo: string;
  cursoId: string;
  asignatura: string;
  grupoId: string;
  grupo: string;
  carreraId: string;
  carrera: string;
  modalidad: string;
  docenteId: string;
  docente: string;
  actividadId: string;
  actividad: string;
  tipo: ReportActivityType;
  unidad: string;
  apertura: string | null;
  entrega: string | null;
  corte: string | null;
  recordarmeCalificar: string | null;
  propedeutico: boolean;
  pesoTarea: number | null;
  pesoIntegradora: number | null;
  pesoForo: number | null;
  pesoExamen: number | null;
}
export interface EnrollmentRow {
  ciclo: string;
  cursoId: string;
  estudianteId: string;
  estudiante: string;
  matricula: string;
}
export interface WithdrawalRow {
  ciclo: string;
  cursoId: string;
  estudianteId: string;
  fechaBaja: string;
}
export interface GradeRow {
  ciclo: string;
  cursoId: string;
  actividadId: string;
  estudianteId: string;
  entregaEn: string | null;
  calificacion: number | null;
  calificadaEn: string | null;
}
export interface InputRows {
  calendario: CalendarRow;
  spai: EnrollmentRow;
  bajas: WithdrawalRow;
  calificaciones: GradeRow;
}
export type InputBatch = {
  [K in InputType]: {
    schemaVersion: 1;
    tipo: K;
    ciclo: string;
    filas: InputRows[K][];
  } & (K extends 'calendario' ? { programacion?: CalendarScheduleRow[] } : object);
}[InputType];
export interface Rejection {
  hoja?: string;
  fila: number;
  motivo: string;
}
export interface Validation {
  batch: InputBatch | null;
  errors: Rejection[];
  rowCount: number;
  preview: { fila: number; resumen: string; hoja?: string }[];
}
export interface InputVersion {
  batch: InputBatch;
  version: number;
  filename: string;
  activatedAt: string;
}
export type LateState = 'en-tiempo' | 'extemporanea' | 'sin-criterio' | 'sin-entrega';
export const LATE_LABELS: Record<LateState, string> = {
  'en-tiempo': 'En tiempo',
  extemporanea: 'Extemporánea',
  'sin-criterio': 'Sin criterio configurado',
  'sin-entrega': 'Sin entrega',
};
export interface ReportRecord {
  calendar: CalendarRow;
  student: EnrollmentRow;
  state: 'calificada' | 'pendiente' | 'sin-entrega' | 'sin-datos';
  late: LateState;
  grade: number | null;
  submittedAt: string | null;
}
export const REPORT_AS_OF = '2026-11-06T23:59:00-05:00';

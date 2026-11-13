/** Programación general: no equivale a una impartición ni a una actividad Moodle vinculada. */
export const CALENDAR_BLOCKS = {
  escolarizada: 'Escolarizada',
  transversal1: 'Transversales · Módulo 1',
  transversal2: 'Transversales · Módulo 2',
  profesionalizante: 'Profesionalizantes · Módulos 1 y 2',
} as const;
export type CalendarBlock = keyof typeof CALENDAR_BLOCKS;
export interface CalendarScheduleRow {
  hoja: string;
  fila: number;
  bloque: CalendarBlock;
  unidad: string;
  actividad: string;
  tipo: 'integradora' | 'foro' | 'examen';
  parcial: string | null;
  ponderacion: number;
  apertura: string;
  entrega: string | null;
  corte: string;
  recordatorio: string | null;
}
export function scheduleModalities(block: CalendarBlock): string[] {
  return block === 'escolarizada' ? ['escolarizada'] : ['ejecutiva', 'virtual', 'posgrados'];
}

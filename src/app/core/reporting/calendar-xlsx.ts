import { CalendarBlock, CalendarScheduleRow, CALENDAR_BLOCKS } from './calendar-schedule';
import { Validation } from './report-models';
import { validateInput, validDate } from './input-validation';

export interface CalendarSheet {
  sheet: string;
  data: unknown[][];
}
const normalized = (v: unknown) =>
  typeof v === 'string'
    ? v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
    : '';
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const types = new Map<string, CalendarScheduleRow['tipo']>([
  ['ACTIVIDAD INTEGRADORA', 'integradora'],
  ['FORO DE PARTICIPACION', 'foro'],
  ['EXAMEN', 'examen'],
]);

/** Date cells are wall-clock values. Never use the machine's local timezone. */
function day(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isInteger(value) && value > 60 && value < 100000)
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
function time(value: unknown): string | null {
  if (value instanceof Date && Number.isFinite(value.getTime()))
    return value.toISOString().slice(11, 19);
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const seconds = Math.round(value * 86400);
    return seconds < 86400 ? new Date(seconds * 1000).toISOString().slice(11, 19) : null;
  }
  return typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value.trim())
    ? value.trim().padEnd(8, ':00')
    : null;
}
function stamp(date: unknown, hour: unknown): string | null {
  const d = day(date),
    t = time(hour);
  const value = d && t ? `${d}T${t}-05:00` : null;
  return validDate(value) ? value : null;
}

/** Headers are resolved independently for every block; column offsets never carry across blocks. */
export function parseCalendarSheets(sheets: CalendarSheet[], cycle: string): Validation {
  const result: Validation = { batch: null, errors: [], preview: [], rowCount: 0 };
  const rows: CalendarScheduleRow[] = [];
  let reviewed = 0;
  const blocks = new Set<CalendarBlock>();
  const reject = (hoja: string, fila: number, motivo: string) =>
    result.errors.push({ hoja, fila, motivo });
  if (cycle !== 'p02')
    reject('Archivo', 0, 'Este calendario 27-2 solo corresponde al ciclo 27-2 (p02).');
  if (sheets.length !== 2)
    reject('Archivo', 0, 'Se requieren las dos hojas del calendario operativo 27-2.');
  for (const sheet of sheets) {
    if (
      !['CALENDARIO OPERATIVO ESC-SALUD', 'CALENDARIO VIRT, EJE, POSGRADO'].includes(
        normalized(sheet.sheet),
      )
    ) {
      reject(
        sheet.sheet,
        0,
        'Pestaña no reconocida. Usa la estructura del calendario operativo 27-2.',
      );
      continue;
    }
    let block: CalendarBlock | null = null,
      headers: string[] | null = null;
    let unit = '',
      partial: string | null = null,
      notes = false;
    if (sheet.data.length > 5000) {
      reject(sheet.sheet, 0, 'Máximo 5000 filas por hoja.');
      continue;
    }
    sheet.data.forEach((cells, index) => {
      const line = index + 1;
      if (cells.every((v) => v === null || v === undefined || v === '')) return;
      const first = normalized(cells[0]);
      if (first.startsWith('CALENDARIO OPERATIVO MOODLE')) {
        headers = null;
        unit = '';
        partial = null;
        notes = false;
        block = null;
        if (!/\b27-2\b/.test(first)) {
          reject(sheet.sheet, line, 'Título sin ciclo 27-2.');
          return;
        }
        if (first.includes('ESCOLARIZADA')) block = 'escolarizada';
        else if (first.includes('PROFESIONALIZANTES') && first.includes('MODULO 1 Y 2'))
          block = 'profesionalizante';
        else if (first.includes('TRANSVERSALES') && first.includes('MODULO 1 '))
          block = 'transversal1';
        else if (first.includes('TRANSVERSALES') && first.includes('MODULO 2 '))
          block = 'transversal2';
        if (!block) {
          reject(sheet.sheet, line, 'Bloque o módulo no reconocido.');
          return;
        }
        if (
          block !== 'escolarizada' &&
          !['EJECUTIVA', 'VIRTUAL', 'POSGRADO'].every((m) => new RegExp(`\\b${m}\\b`).test(first))
        )
          reject(
            sheet.sheet,
            line,
            'El título debe identificar Ejecutiva, Virtual y Posgrado; no se infieren modalidades faltantes.',
          );
        if (
          (block === 'escolarizada') !==
          (normalized(sheet.sheet) === 'CALENDARIO OPERATIVO ESC-SALUD')
        )
          reject(sheet.sheet, line, 'El bloque no corresponde a esta hoja.');
        if (blocks.has(block)) reject(sheet.sheet, line, 'Bloque duplicado.');
        blocks.add(block);
        return;
      }
      if (first.startsWith('NOTA:')) {
        notes = true;
        return;
      }
      if (notes) return;
      if (!block) {
        reject(sheet.sheet, line, 'Fila sin título de bloque reconocido.');
        return;
      }
      const labels = cells.map(normalized);
      if (labels.includes('ACTIVIDAD EN MOODLE')) {
        if (headers) reject(sheet.sheet, line, 'Encabezado repetido sin nuevo título de bloque.');
        headers = labels;
        const required = [
          'UNIDAD',
          'ACTIVIDAD EN MOODLE',
          'PONDERACION',
          'RECORDARME CALIFICAR EN MOODLE',
        ];
        if (block === 'escolarizada')
          required.push(
            'PARCIALES',
            'PERMITIR ENVIOS A PARTIR DE',
            'FECHA DE ENTREGA',
            'FECHA DE CORTE',
          );
        else if (block === 'profesionalizante')
          required.push('PERMITIR ENVIOS A PARTIR DE', 'FECHA DE ENTREGA');
        else required.push('APERTURA', 'CIERRE');
        for (const name of required)
          if (labels.filter((h) => h === name).length !== 1)
            reject(sheet.sheet, line, `Falta o se duplica el encabezado ${name}.`);
        const closings =
          block === 'escolarizada'
            ? ['FECHA DE ENTREGA', 'FECHA DE CORTE']
            : [block === 'profesionalizante' ? 'FECHA DE ENTREGA' : 'CIERRE'];
        for (const name of closings)
          if (labels[labels.indexOf(name) + 1] !== 'HORA')
            reject(sheet.sheet, line, `Se requiere HORA inmediatamente después de ${name}.`);
        return;
      }
      if (!headers) {
        reject(sheet.sheet, line, 'Falta el encabezado de columnas de este bloque.');
        return;
      }
      reviewed++;
      const get = (name: string) => cells[headers!.indexOf(name)];
      const ownUnit = get('UNIDAD');
      if (ownUnit !== null && ownUnit !== undefined && ownUnit !== '') unit = normalized(ownUnit);
      if (!/^UNIDAD [1-7]$/.test(unit))
        reject(sheet.sheet, line, 'Unidad inválida o ausente: se requiere UNIDAD 1 a UNIDAD 7.');
      if (block === 'escolarizada' && text(get('PARCIALES'))) partial = text(get('PARCIALES'));
      if (
        block === 'escolarizada' &&
        !/^PARCIAL [1-3]\s*\|\s*\d+(\.\d+)?%$/.test(normalized(partial))
      )
        reject(sheet.sheet, line, 'Parcial y ponderación del parcial ausentes o inválidos.');
      const activity = text(get('ACTIVIDAD EN MOODLE'));
      const type = types.get(normalized(activity));
      if (!type) reject(sheet.sheet, line, 'Actividad no reconocida (integradora, foro o examen).');
      const weight = get('PONDERACION');
      if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 100)
        reject(
          sheet.sheet,
          line,
          'Ponderación inválida: número entre 0 y 100, sin convertirlo en avance.',
        );
      const openLabel = headers.includes('APERTURA') ? 'APERTURA' : 'PERMITIR ENVIOS A PARTIR DE';
      const closeLabel =
        block === 'escolarizada'
          ? 'FECHA DE CORTE'
          : block === 'profesionalizante'
            ? 'FECHA DE ENTREGA'
            : 'CIERRE';
      const opening = stamp(get(openLabel), '00:00:00');
      const closing = stamp(get(closeLabel), cells[headers.indexOf(closeLabel) + 1]);
      const delivery =
        block === 'escolarizada'
          ? stamp(get('FECHA DE ENTREGA'), cells[headers.indexOf('FECHA DE ENTREGA') + 1])
          : null;
      for (const [label, value] of [
        ['Apertura', opening],
        ['Corte / cierre', closing],
        ...(block === 'escolarizada' ? [['Entrega', delivery]] : []),
      ])
        if (!value)
          reject(
            sheet.sheet,
            line,
            `${label}: fecha u hora inválida. Usa fecha Excel o DD/MM/AAAA y hora HH:mm.`,
          );
      if (opening && closing && type && activity && typeof weight === 'number')
        rows.push({
          hoja: sheet.sheet,
          fila: line,
          bloque: block,
          unidad: 'u0' + unit.slice(-1),
          actividad: activity,
          tipo: type,
          parcial: partial,
          ponderacion: weight,
          apertura: opening,
          entrega: delivery,
          corte: closing,
          recordatorio: text(get('RECORDARME CALIFICAR EN MOODLE')),
        });
    });
  }
  for (const b of Object.keys(CALENDAR_BLOCKS) as CalendarBlock[])
    if (!blocks.has(b)) reject('Archivo', 0, `Falta el bloque ${CALENDAR_BLOCKS[b]}.`);
  result.rowCount = reviewed;
  const checked = validateInput(
    JSON.stringify({
      schemaVersion: 1,
      tipo: 'calendario',
      ciclo: cycle,
      filas: [],
      programacion: rows,
    }),
    'calendario',
    cycle,
  );
  result.errors.push(...checked.errors.map((e) => ({ ...e, hoja: e.hoja ?? 'Archivo' })));
  result.preview = checked.preview;
  if (!result.errors.length) result.batch = checked.batch;
  return result;
}

export async function readCalendarXlsx(file: File, cycle: string): Promise<Validation> {
  const { default: read } = await import('read-excel-file/universal');
  try {
    return parseCalendarSheets(await read(await file.arrayBuffer()), cycle);
  } catch {
    return {
      batch: null,
      rowCount: 0,
      preview: [],
      errors: [
        {
          hoja: 'Archivo',
          fila: 0,
          motivo:
            'No se pudo abrir el XLSX. Usa una copia válida, sin protección y con valores disponibles. Se conserva la versión vigente.',
        },
      ],
    };
  }
}

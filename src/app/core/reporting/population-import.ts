import type { Validation } from './report-models';
import {
  canonical,
  declaredCycles,
  fold,
  registration,
  validRegistration,
  type RosterRow,
  type TeachingRow,
} from './population';

type Kind = 'saeko' | 'spai';
const saekoFields = [
  'matricula',
  'nombre',
  'correo',
  'plan',
  'grupo',
  'cicloOrigen',
  'hoja',
] as const;
const spaiFields = [
  'numero',
  'materia',
  'carrera',
  'grupo',
  'comparte',
  'matriculas',
  'cicloOrigen',
  'hoja',
] as const;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function validatePopulation(
  raw: Record<string, unknown>,
  type: Kind,
  cycle: string,
  result: Validation,
): Validation {
  const saeko = type === 'saeko';
  const rows: unknown = saeko ? raw['filas'] : raw['imparticiones'];
  const cutoff = raw['fechaCorte'];
  if (
    cutoff != null &&
    !(
      typeof cutoff === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(cutoff) &&
      Number.isFinite(Date.parse(cutoff)) &&
      new Date(cutoff).toISOString().slice(0, 10) === cutoff
    )
  )
    result.errors.push({ fila: 0, motivo: 'Fecha de corte del padrón inválida (AAAA-MM-DD).' });
  if (
    !Array.isArray(rows) ||
    rows.length < 1 ||
    rows.length > 5000 ||
    (!saeko && (raw['filas'] as unknown[]).length)
  ) {
    result.errors.push({ fila: 0, motivo: 'Se requieren entre 1 y 5000 filas de una sola clase.' });
    return result;
  }
  const students: RosterRow[] = [],
    courses: TeachingRow[] = [],
    seen = new Map<string, number>();
  result.rowCount = rows.length;
  for (const [i, r] of rows.entries()) {
    if (!object(r)) {
      result.errors.push({ fila: i + 1, motivo: 'Fila inválida.' });
      continue;
    }
    const hoja = typeof r['hoja'] === 'string' ? r['hoja'] : 'Archivo',
      fila =
        typeof r['fila'] === 'number' && Number.isSafeInteger(r['fila']) && r['fila'] > 0
          ? r['fila']
          : i + 1;
    const reject = (motivo: string) => result.errors.push({ hoja, fila, motivo });
    const before = result.errors.length;
    const fields = saeko ? saekoFields : spaiFields;
    for (const key of fields) {
      const v = r[key];
      if (
        typeof v !== 'string' ||
        v.length > 4000 ||
        (!v.trim() && key !== 'comparte' && key !== 'matriculas')
      )
        reject(`Campo ${key}: se requiere texto válido.`);
    }
    if (r['fila'] !== fila) reject('Falta el número de fila de origen.');
    if (!saeko && typeof r['celdaNumerica'] !== 'boolean')
      reject('Falta el tipo de celda de matrícula.');
    if (result.errors.length !== before) continue;
    const val = (k: string) => r[k] as string;
    const source = { hoja, fila, cicloOrigen: val('cicloOrigen') };
    const cycles = declaredCycles(source.cicloOrigen);
    if (!cycles.length || cycles.some((c) => c !== cycle))
      reject('El ciclo de origen no coincide con el seleccionado.');
    const group = val('grupo');
    for (const [label, g] of [
      [saeko ? 'Grupo' : 'Grupo base', group],
      ...(saeko
        ? []
        : val('comparte')
            .split(/[,;\n]/)
            .map((g) => ['Comparte con', g])),
    ]) {
      if (declaredCycles(g).some((c) => c !== cycle))
        reject(label + ': ciclo ajeno o contradictorio en ' + g.trim() + '.');
    }
    let key: string, resumen: string;
    if (saeko) {
      const matricula = val('matricula');
      key = registration(matricula);
      resumen = `${matricula} · ${group} · ${val('plan')}`;
      if (!validRegistration(matricula))
        reject('Matrícula inválida: usa TUP seguido de dígitos en una celda de texto.');
      students.push({
        ...source,
        matricula,
        nombre: val('nombre'),
        correo: val('correo'),
        plan: val('plan'),
        grupo: group,
      });
    } else {
      const row = {
        ...source,
        numero: val('numero'),
        materia: val('materia'),
        carrera: val('carrera'),
        grupo: group,
        comparte: val('comparte'),
        matriculas: val('matriculas'),
        celdaNumerica: r['celdaNumerica'] === true,
      };
      key = JSON.stringify([
        fold(row.numero).replace(/\.$/, ''),
        fold(row.materia),
        canonical(group),
      ]);
      resumen = `${row.numero} ${row.materia} · ${group}`;
      courses.push(row);
    }
    if (seen.has(key))
      reject(
        `Identidad duplicada o ambigua; revisar también la fila ${seen.get(key)}. No se reemplaza la versión vigente.`,
      );
    else seen.set(key, fila);
    if (result.preview.length < 10) result.preview.push({ hoja, fila, resumen });
  }
  if (!result.errors.length)
    result.batch = saeko
      ? {
          schemaVersion: 1,
          tipo: 'saeko',
          ciclo: cycle,
          filas: students,
          fechaCorte: typeof cutoff === 'string' ? cutoff : null,
        }
      : { schemaVersion: 1, tipo: 'spai', ciclo: cycle, filas: [], imparticiones: courses };
  return result;
}

class XlsxNumber {
  constructor(readonly literal: string) {}
}
export const populationXlsxOptions = {
  trim: false,
  parseNumber: (raw: string) => new XlsxNumber(raw),
};

type Sheet = { sheet: string; data: unknown[][] };
const rosterColumns = {
  matricula: 'MATRICULA',
  nombre: 'NOMBRE COMPLETO',
  correo: 'CORREO INSTITUCIONAL',
  plan: 'PLAN DE ESTUDIOS O CURSO',
  grupo: 'GRUPO',
  cicloOrigen: 'CICLO',
};
const courseColumns = {
  numero: 'ID MOODLE',
  materia: 'MATERIA',
  carrera: 'CARRERA',
  grupo: 'GRUPO BASE',
  comparte: 'COMPARTE CON',
  matriculas: 'MATRICULA(S)',
};
export function parsePopulationSheets(sheets: Sheet[], type: Kind, cycle: string): Validation {
  const result: Validation = { errors: [], preview: [], rowCount: 0, batch: null };
  const saeko = type === 'saeko',
    columns = saeko ? rosterColumns : courseColumns;
  const matches = sheets.flatMap((s) =>
    s.data.slice(0, 30).flatMap((r, index) => {
      const labels = r.map((x) => (typeof x === 'string' ? fold(x) : ''));
      return Object.values(columns).every((k) => labels.includes(k)) ? [{ s, index, labels }] : [];
    }),
  );
  if (matches.length !== 1) {
    result.errors.push({
      fila: 0,
      motivo: 'Se requiere una sola tabla con todos los encabezados del formato documentado.',
    });
    return result;
  }
  const [{ s, index, labels }] = matches;
  if (Object.values(columns).some((k) => labels.indexOf(k) !== labels.lastIndexOf(k))) {
    result.errors.push({ hoja: s.sheet, fila: index + 1, motivo: 'Encabezado duplicado.' });
    return result;
  }
  const cycleRows = s.data
    .slice(0, index)
    .filter((r) => typeof r[0] === 'string' && fold(r[0]) === 'CICLO');
  const cicloOrigen = cycleRows.length === 1 ? cycleRows[0][1] : null;
  const rows: Record<string, unknown>[] = [];
  s.data.slice(index + 1).forEach((r, i) => {
    if (r.every((v) => v == null || v === '')) return;
    const row: Record<string, unknown> = { hoja: s.sheet, fila: index + i + 2, cicloOrigen };
    for (const [key, title] of Object.entries(columns)) {
      const v = r[labels.indexOf(title)];
      row[key] =
        v instanceof XlsxNumber && key === 'matriculas'
          ? v.literal
          : v instanceof XlsxNumber && key === 'numero'
            ? String(Number(v.literal))
            : typeof v === 'number' && (key === 'numero' || key === 'matriculas')
              ? String(v)
              : (v ?? '');
    }
    if (!saeko) {
      const value = r[labels.indexOf(courseColumns.matriculas)];
      row['celdaNumerica'] = value instanceof XlsxNumber || typeof value === 'number';
    }
    if (
      saeko &&
      labels.includes('ESTADO DE INSCRIPCION') &&
      fold(String(r[labels.indexOf('ESTADO DE INSCRIPCION')])) !== 'INSCRITO'
    ) {
      result.errors.push({
        hoja: s.sheet,
        fila: index + i + 2,
        motivo: 'Estado distinto de Inscrito: verifica que sea el padrón activo.',
      });
    }
    rows.push(row);
  });
  return validatePopulation(
    { filas: saeko ? rows : [], imparticiones: saeko ? undefined : rows },
    type,
    cycle,
    result,
  );
}

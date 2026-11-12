import {
  ACTIVITY_TYPES,
  CYCLES,
  InputBatch,
  InputType,
  MODALITIES,
  Validation,
} from './report-models';

const common = ['ciclo', 'cursoId'];
const fields: Record<InputType, readonly string[]> = {
  calendario: [
    ...common,
    'asignatura',
    'grupoId',
    'grupo',
    'carreraId',
    'carrera',
    'modalidad',
    'docenteId',
    'docente',
    'actividadId',
    'actividad',
    'tipo',
    'unidad',
    'apertura',
    'entrega',
    'corte',
    'recordarmeCalificar',
    'propedeutico',
    'pesoTarea',
    'pesoIntegradora',
    'pesoForo',
    'pesoExamen',
  ],
  spai: [...common, 'estudianteId', 'estudiante', 'matricula'],
  bajas: [...common, 'estudianteId', 'fechaBaja'],
  calificaciones: [
    ...common,
    'actividadId',
    'estudianteId',
    'entregaEn',
    'calificacion',
    'calificadaEn',
  ],
};
const nullable = new Set([
  'apertura',
  'entrega',
  'corte',
  'recordarmeCalificar',
  'pesoTarea',
  'pesoIntegradora',
  'pesoForo',
  'pesoExamen',
  'entregaEn',
  'calificacion',
  'calificadaEn',
]);
const dates = new Set([
  'apertura',
  'entrega',
  'corte',
  'recordarmeCalificar',
  'fechaBaja',
  'entregaEn',
  'calificadaEn',
]);
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** ISO con zona y fecha real, no se aceptan las normalizaciones de 30 de febrero de Date.parse. */
export function validDate(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return false;
  const day = value.slice(0, 10);
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    return false;
  try {
    return Number.isFinite(Date.parse(value)) && new Date(day).toISOString().slice(0, 10) === day;
  } catch {
    return false;
  }
}
export function validateInput(text: string, type: InputType, cycle: string): Validation {
  const result: Validation = { batch: null, errors: [], rowCount: 0, preview: [] };
  const reject = (fila: number, motivo: string) => result.errors.push({ fila, motivo });
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    reject(0, 'JSON inválido. Usa una plantilla ficticia UTF-8.');
    return result;
  }
  if (!object(raw)) {
    reject(0, 'Se requiere un objeto con schemaVersion, tipo, ciclo y filas.');
    return result;
  }
  if (raw['schemaVersion'] !== 1) reject(0, 'schemaVersion debe ser 1.');
  if (raw['tipo'] !== type)
    reject(0, 'El tipo del archivo no coincide con el insumo seleccionado.');
  if (raw['ciclo'] !== cycle || !CYCLES.some((c) => c.value === cycle))
    reject(0, 'El ciclo del archivo no coincide con el ciclo seleccionado.');
  if (!Array.isArray(raw['filas'])) {
    reject(0, 'filas debe ser una lista.');
    return result;
  }
  const rows: unknown[] = raw['filas'];
  result.rowCount = rows.length;
  if (rows.length > 5000) {
    reject(0, 'Límite de demostración: 5000 filas.');
    return result;
  }
  if (!rows.length && type !== 'bajas') reject(0, 'El archivo debe contener al menos una fila.');
  const keys = new Set<string>();
  const courses = new Map<string, string>();
  const identities = new Map<string, string>();
  rows.forEach((row, i) => {
    const n = i + 1;
    if (!object(row)) {
      reject(n, 'La fila debe ser un objeto.');
      return;
    }
    result.preview.push({
      fila: n,
      resumen: [row['cursoId'], row['actividadId'], row['estudianteId'], row['actividad']]
        .filter((v) => typeof v === 'string')
        .join(' · '),
    });
    for (const key of fields[type]) {
      const value = row[key];
      if (!Object.hasOwn(row, key)) {
        reject(n, `Falta el campo obligatorio ${key}.`);
        continue;
      }
      if (value === null && nullable.has(key)) continue;
      if (key === 'propedeutico') {
        if (typeof value !== 'boolean') reject(n, 'propedeutico debe ser booleano.');
      } else if (key.startsWith('peso') || key === 'calificacion') {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
          reject(n, `${key} debe estar entre 0 y 100 o ser null.`);
      } else if (typeof value !== 'string' || !value.trim() || value.length > 180)
        reject(n, `${key} requiere texto no vacío (máximo 180 caracteres).`);
      else if (dates.has(key) && !validDate(value))
        reject(n, `${key}: fecha ISO inválida; incluye hora y zona.`);
      else if ((key.endsWith('Id') || key === 'ciclo') && !/^[a-zA-Z0-9_-]+$/.test(value))
        reject(n, `${key}: usa un identificador sin espacios.`);
    }
    for (const key of Object.keys(row))
      if (!fields[type].includes(key)) reject(n, `Campo no reconocido: ${key}.`);
    if (row['ciclo'] !== cycle) reject(n, 'La fila pertenece a otro ciclo.');
    for (const field of dates)
      if (validDate(row[field])) {
        const timestamp = Date.parse(row[field]);
        const start = cycle === 'p01' ? '2026-09-01T00:00:00-05:00' : '2027-01-01T00:00:00-05:00';
        const end = cycle === 'p01' ? '2027-01-01T00:00:00-05:00' : '2027-05-01T00:00:00-05:00';
        if (timestamp < Date.parse(start) || timestamp >= Date.parse(end))
          reject(n, `${field}: fecha fuera del intervalo ficticio del ciclo.`);
      }
    const key = JSON.stringify(
      type === 'calendario'
        ? [row['cursoId'], row['actividadId']]
        : type === 'calificaciones'
          ? [row['cursoId'], row['actividadId'], row['estudianteId']]
          : [row['cursoId'], row['estudianteId']],
    );
    if (keys.has(key)) reject(n, 'Registro duplicado dentro del archivo.');
    keys.add(key);
    const ordered = (a: string, b: string) => {
      if (validDate(row[a]) && validDate(row[b]) && Date.parse(row[a]) > Date.parse(row[b]))
        reject(n, `${a} debe ser anterior o igual a ${b}.`);
    };
    if (type === 'calendario') {
      if (!ACTIVITY_TYPES.some((t) => t === row['tipo']))
        reject(n, 'Tipo de actividad no reconocido.');
      if (!MODALITIES.some((m) => m === row['modalidad'])) reject(n, 'Modalidad no reconocida.');
      if (!['u01', 'u02'].includes(String(row['unidad'])))
        reject(n, 'Unidad no reconocida (u01 o u02).');
      ordered('apertura', 'corte');
      ordered('apertura', 'entrega');
      ordered('entrega', 'corte');
      const weights = ['pesoTarea', 'pesoIntegradora', 'pesoForo', 'pesoExamen'].map((k) => row[k]);
      if (
        !weights.every((v) => v === null) &&
        (!weights.every((v) => typeof v === 'number') ||
          Math.abs(
            weights.reduce<number>((sum, v) => sum + (typeof v === 'number' ? v : 0), 0) - 100,
          ) > 0.001)
      )
        reject(n, 'La ponderación del curso debe sumar 100%, o usar null en sus cuatro pesos.');
      const course = String(row['cursoId']);
      const signature = JSON.stringify(
        [
          'asignatura',
          'grupoId',
          'grupo',
          'carreraId',
          'carrera',
          'modalidad',
          'docenteId',
          'docente',
          'propedeutico',
          ...['pesoTarea', 'pesoIntegradora', 'pesoForo', 'pesoExamen'],
        ].map((k) => row[k]),
      );
      if (courses.has(course) && courses.get(course) !== signature)
        reject(n, 'El curso tiene datos o ponderaciones contradictorios.');
      courses.set(course, signature);
      for (const [id, data] of [
        [
          'grupo:' + row['grupoId'],
          JSON.stringify([row['grupo'], row['carreraId'], row['carrera'], row['modalidad']]),
        ],
        ['docente:' + row['docenteId'], String(row['docente'])],
        ['carrera:' + row['carreraId'], String(row['carrera'])],
      ]) {
        if (identities.has(id) && identities.get(id) !== data)
          reject(n, 'Identificador de catálogo con datos contradictorios.');
        identities.set(id, data);
      }
    }
    if (type === 'spai') {
      const identity = String(row['estudianteId']);
      const data = JSON.stringify([row['estudiante'], row['matricula']]);
      if (identities.has(identity) && identities.get(identity) !== data)
        reject(n, 'Estudiante con nombre o matrícula contradictorios.');
      identities.set(identity, data);
      const registration = 'matricula:' + row['matricula'];
      if (identities.has(registration) && identities.get(registration) !== identity)
        reject(n, 'Matrícula asociada a más de un estudiante.');
      identities.set(registration, identity);
    }
    if (type === 'calificaciones') {
      ordered('entregaEn', 'calificadaEn');
      if (
        row['calificacion'] !== null &&
        (row['entregaEn'] === null || row['calificadaEn'] === null)
      )
        reject(n, 'Una calificación requiere entregaEn y calificadaEn.');
      if (row['calificacion'] === null && row['calificadaEn'] !== null)
        reject(n, 'Sin calificación, calificadaEn debe ser null.');
    }
  });
  // La conversión ocurre solamente después de validar exhaustivamente la estructura y cada campo.
  if (!result.errors.length) result.batch = raw as unknown as InputBatch;
  return result;
}

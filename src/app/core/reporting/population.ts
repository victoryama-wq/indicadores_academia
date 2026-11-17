import type { InputBatch, Rejection } from './report-models';

interface Source {
  hoja: string;
  fila: number;
  cicloOrigen: string;
}
export interface RosterRow extends Source {
  matricula: string;
  nombre: string;
  correo: string;
  plan: string;
  grupo: string;
}
export interface TeachingRow extends Source {
  numero: string;
  materia: string;
  carrera: string;
  grupo: string;
  comparte: string;
  matriculas: string;
  celdaNumerica: boolean;
}
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
export const canonical = (s: string) =>
  fold(s)
    .replace(/\bCOMPUB\b/g, 'CONPUB')
    .replace(/\b27-\s+([12])\b/g, '27-$1');
export const registration = (s: string) => s.trim().toUpperCase();
export const validRegistration = (s: string) => /^TUP[0-9]+$/i.test(s.trim());
export function cycleFrom(s: string) {
  const cycles = [...canonical(s).matchAll(/\b(?:27-([12])|2027-0([12]))\b/g)].map(
    (m) => 'p0' + (m[1] ?? m[2]),
  );
  return new Set(cycles).size === 1 ? cycles[0] : null;
}
const excluded = (s: string) => /(?:^|\s)ING(?:-FCS)?(?:\s|$)/.test(s);
export const excludedCourse = (row: TeachingRow) =>
  excluded(canonical(row.carrera)) || excluded(canonical(row.grupo));
const excludedStudent = (p: Student) => excluded(p.group) || /^(?:ING|ING-FCS)$/.test(p.plan);
const special = (s: string) => /C\.\s*A\.?$/.test(s) || s === 'CASO ESPECIAL';
const parts = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
function student(r: RosterRow) {
  const plan = canonical(r.plan);
  return {
    source: r,
    id: registration(r.matricula),
    group: canonical(r.grupo),
    plan: /^(?:MAESTRIA EN )?ADMINISTRACION DE NEGOCIOS(?: PLAN 2027)?$/.test(plan)
      ? plan.endsWith('2027')
        ? 'MBA 2027'
        : 'MBA'
      : plan,
  };
}
type Student = ReturnType<typeof student>;
interface Link {
  person: Student;
  course: TeachingRow;
  evidence: Set<string>;
}
export function crossPopulation(cycle: string, inputs: readonly InputBatch[]) {
  const batches = inputs.filter((b) => b.ciclo === cycle);
  const roster = batches.find((b) => b.tipo === 'saeko');
  const courses = batches.find((b) => b.tipo === 'spai')?.imparticiones;
  if (!roster && !courses) return null;
  const people = (roster?.filas ?? []).map(student);
  const byId = new Map<string, Student[]>(),
    byGroup = new Map<string, Student[]>();
  function index(map: Map<string, Student[]>, key: string, value: Student) {
    const group = map.get(key);
    if (group) group.push(value);
    else map.set(key, [value]);
  }
  for (const p of people) {
    index(byId, p.id, p);
    index(byGroup, p.group, p);
  }
  const candidates = new Map<string, Link | null>(),
    issues: Rejection[] = [],
    proposed: Rejection[] = [];
  const covered = new Set<string>();
  const note = (r: Source, motivo: string) => ({ hoja: r.hoja, fila: r.fila, motivo });
  let excludedCourses = 0;
  for (const course of courses ?? []) {
    if (excludedCourse(course)) {
      excludedCourses++;
      continue;
    }
    const local = new Map<string, Link>();
    const add = (p: Student, via: string) => {
      if (excludedStudent(p) || byId.get(p.id)?.length !== 1) return;
      const link = local.get(p.id) ?? { person: p, course, evidence: new Set<string>() };
      link.evidence.add(via);
      local.set(p.id, link);
    };
    if (roster) {
      for (const [via, raw] of [
        ['Grupo base', course.grupo],
        ...parts(course.comparte).map((g) => ['Comparte con', g]),
      ]) {
        const group = canonical(raw);
        if (special(group) || excluded(group)) continue;
        const members = byGroup.get(group);
        if (!members) issues.push(note(course, `${via}: ${raw} sin coincidencia en el padrón.`));
        for (const p of members ?? []) add(p, via);
      }
      for (const raw of parts(course.matriculas)) {
        const numeric = /^[0-9]+$/.test(raw),
          id = numeric ? 'TUP' + raw : registration(raw);
        const matches = byId.get(id);
        if (!course.celdaNumerica && validRegistration(id) && matches?.length === 1) {
          add(matches[0], 'Matrícula explícita');
          continue;
        }
        const reason = course.celdaNumerica
          ? 'Celda numérica: no se puede verificar que conserve los ceros originales.'
          : !validRegistration(id)
            ? 'Formato de matrícula inválido.'
            : matches
              ? 'Coincidencia ambigua.'
              : 'Sin coincidencia exacta en el padrón del ciclo.';
        const detail = note(course, `${raw} · ${reason}`);
        issues.push(detail);
        if (numeric) proposed.push(note(course, `${raw} → ${id} · ${reason}`));
      }
    }
    for (const link of local.values()) {
      const key = JSON.stringify([
        link.person.id,
        fold(course.numero).replace(/\.$/, ''),
        fold(course.materia),
      ]);
      if (!candidates.has(key)) {
        candidates.set(key, link);
        continue;
      }
      const earlier = candidates.get(key);
      const reason =
        'Localizador y título repetidos para este estudiante en distintas imparticiones; verificar el curso antes de contar.';
      if (earlier) issues.push(note(earlier.course, link.person.id + ' · ' + reason));
      issues.push(note(course, link.person.id + ' · ' + reason));
      candidates.set(key, null);
    }
  }
  const links = [...candidates.values()].filter((l): l is Link => l !== null);
  for (const link of links) covered.add(link.person.id);
  const eligible = people.filter((p) => !excludedStudent(p));
  const uncovered = eligible.filter((p) => !covered.has(p.id));
  if (courses)
    for (const p of uncovered)
      issues.push(
        note(
          p.source,
          `${p.id} · ${p.source.grupo}: Asignación por confirmar${special(p.group) ? ' (C.A requiere matrícula explícita)' : ''}.`,
        ),
      );
  return {
    hasRoster: !!roster,
    hasCourses: !!courses,
    cutoff: roster?.fechaCorte ?? null,
    people,
    links,
    issues,
    proposed,
    active: byId.size,
    covered: covered.size,
    uncovered: uncovered.length,
    excludedStudents: people.length - eligible.length,
    excludedCourses,
    byGroup: links.filter((l) => l.evidence.has('Grupo base') || l.evidence.has('Comparte con'))
      .length,
    byRegistration: links.filter((l) => l.evidence.has('Matrícula explícita')).length,
  };
}

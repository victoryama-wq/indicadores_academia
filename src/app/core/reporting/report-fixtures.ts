import { Snapshot } from '../models';
import {
  CalendarRow,
  EnrollmentRow,
  GradeRow,
  InputBatch,
  InputType,
  ReportActivityType,
} from './report-models';

export function demoCalendar(cycle: string, course = 'demo-curso'): CalendarRow {
  const month = cycle === 'p02' ? '2027-03' : '2026-11';
  return {
    ciclo: cycle,
    cursoId: course,
    asignatura: 'Curso ficticio de demostración',
    grupoId: 'demo-grupo',
    grupo: 'DEMO-01',
    carreraId: 'adm',
    carrera: 'Licenciatura en Administración',
    modalidad: 'ejecutiva',
    docenteId: 'd04',
    docente: 'Docente Demo D',
    actividadId: 'demo-tarea',
    actividad: 'Tarea de demostración',
    tipo: 'tarea',
    unidad: 'u01',
    apertura: month + '-01T08:00:00-05:00',
    entrega: null,
    corte: month + '-05T23:59:00-05:00',
    recordarmeCalificar: month + '-02T08:00:00-05:00',
    propedeutico: false,
    pesoTarea: 40,
    pesoIntegradora: 30,
    pesoForo: 10,
    pesoExamen: 20,
  };
}
export function sampleBatch(type: InputType, cycle: string): InputBatch {
  const month = cycle === 'p02' ? '2027-03' : '2026-11';
  switch (type) {
    case 'calendario':
      return { schemaVersion: 1, tipo: type, ciclo: cycle, filas: [demoCalendar(cycle)] };
    case 'spai':
      return {
        schemaVersion: 1,
        tipo: type,
        ciclo: cycle,
        filas: [
          {
            ciclo: cycle,
            cursoId: 'demo-curso',
            estudianteId: 'demo-e01',
            estudiante: 'Estudiante Ficticio 01',
            matricula: 'DEMO-01',
          },
        ],
      };
    case 'bajas':
      return {
        schemaVersion: 1,
        tipo: type,
        ciclo: cycle,
        filas: [
          {
            ciclo: cycle,
            cursoId: 'demo-curso',
            estudianteId: 'demo-e01',
            fechaBaja: month + '-06T08:00:00-05:00',
          },
        ],
      };
    case 'calificaciones':
      return {
        schemaVersion: 1,
        tipo: type,
        ciclo: cycle,
        filas: [
          {
            ciclo: cycle,
            cursoId: 'demo-curso',
            actividadId: 'demo-tarea',
            estudianteId: 'demo-e01',
            entregaEn: month + '-04T12:00:00-05:00',
            calificacion: 0,
            calificadaEn: month + '-05T12:00:00-05:00',
          },
        ],
      };
  }
}
/** Reutiliza el conjunto académico original sin cambiar su recorrido. */
export function seedBatches(snapshot: Snapshot): InputBatch[] {
  const calendar: CalendarRow[] = snapshot.activities.map((a) => {
    const s = snapshot.subjects.find((s) => s.id === a.subjectId)!;
    const g = snapshot.groups.find((g) => g.id === s.groupId)!;
    return {
      ...demoCalendar('p01', s.id),
      asignatura: s.name,
      grupoId: g.id,
      grupo: g.name,
      carreraId: g.programId,
      carrera: g.program,
      modalidad: g.modalityId,
      docenteId: s.teacherId,
      docente: s.teacher,
      actividadId: a.id,
      actividad: a.name,
      entrega: a.dueAt,
      corte: '2026-11-06T23:59:00-05:00',
      pesoTarea: 100,
      pesoIntegradora: 0,
      pesoForo: 0,
      pesoExamen: 0,
    };
  });
  const enrollments = new Map<string, EnrollmentRow>();
  const grades: GradeRow[] = snapshot.records.map((r) => {
    const a = calendar.find((a) => a.actividadId === r.activityId)!;
    enrollments.set(a.cursoId + ':' + r.studentId, {
      ciclo: 'p01',
      cursoId: a.cursoId,
      estudianteId: r.studentId,
      estudiante: r.studentName,
      matricula: r.registration,
    });
    return {
      ciclo: 'p01',
      cursoId: a.cursoId,
      actividadId: r.activityId,
      estudianteId: r.studentId,
      entregaEn: r.submittedAt,
      calificacion: r.grade,
      calificadaEn: r.grade !== null ? '2026-11-04T12:00:00-05:00' : null,
    };
  });
  for (const [index, modality] of ['ejecutiva', 'virtual', 'posgrados'].entries()) {
    const course = 'rep-curso-' + index;
    const types: ReportActivityType[] =
      index === 0
        ? ['tarea', 'integradora']
        : index === 1
          ? ['foro', 'examen']
          : ['tarea', 'examen'];
    for (const [position, type] of types.entries()) {
      const a: CalendarRow = {
        ...demoCalendar('p01', course),
        grupoId: 'rep-grupo-' + index,
        grupo: ['EJE-101', 'VIR-101', 'POS-101'][index],
        modalidad: modality,
        asignatura: ['Gestión ejecutiva', 'Aprendizaje virtual', 'Investigación de posgrado'][
          index
        ],
        actividadId: course + '-' + type,
        actividad: ['Actividad de apertura', 'Actividad de cierre'][position],
        tipo: type,
        unidad: position ? 'u02' : 'u01',
      };
      calendar.push(a);
      for (const n of [1, 2]) {
        const id = 'rep-e0' + n;
        enrollments.set(course + ':' + id, {
          ciclo: 'p01',
          cursoId: course,
          estudianteId: id,
          estudiante: 'Estudiante Reporte Demo ' + n,
          matricula: 'REP-DEMO-0' + n,
        });
        grades.push({
          ciclo: 'p01',
          cursoId: course,
          actividadId: a.actividadId,
          estudianteId: id,
          entregaEn: n === 1 ? '2026-11-04T12:00:00-05:00' : '2026-11-06T12:00:00-05:00',
          calificacion: n === 1 ? 90 : null,
          calificadaEn: n === 1 ? '2026-11-05T12:00:00-05:00' : null,
        });
      }
    }
  }
  calendar.push({
    ...demoCalendar('p01', 'rep-prop'),
    grupoId: 'rep-prop',
    grupo: 'PROP-01',
    asignatura: 'Propedéutico',
    actividadId: 'rep-prop-a01',
    actividad: 'Introducción al programa',
    propedeutico: true,
    apertura: null,
    corte: null,
    pesoTarea: null,
    pesoIntegradora: null,
    pesoForo: null,
    pesoExamen: null,
  });
  return [
    { schemaVersion: 1, tipo: 'calendario', ciclo: 'p01', filas: calendar },
    { schemaVersion: 1, tipo: 'spai', ciclo: 'p01', filas: [...enrollments.values()] },
    { schemaVersion: 1, tipo: 'bajas', ciclo: 'p01', filas: [] },
    { schemaVersion: 1, tipo: 'calificaciones', ciclo: 'p01', filas: grades },
  ];
}

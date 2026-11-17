import type { InputBatch } from './report-models';
export function populationSample(type: 'saeko' | 'spai', cycle: string): InputBatch {
  const c = cycle === 'p01' ? '27-1' : '27-2';
  const groups = [
    'COMPUB 11 04A',
    'PED 11 04A',
    'MBA 24 04A',
    'MBA 24 04A',
    'PED 11 04C.A',
    'PED 11 04C.A',
    'ING 11 01A',
  ];
  if (type === 'saeko')
    return {
      schemaVersion: 1,
      tipo: type,
      ciclo: cycle,
      fechaCorte: null,
      filas: groups.map((g, i) => ({
        hoja: 'Padrón ficticio',
        fila: i + 2,
        cicloOrigen: c,
        matricula: 'TUP000' + (i + 1),
        nombre: 'Estudiante ficticio ' + (i + 1),
        correo: `demo${i + 1}@example.invalid`,
        plan: [
          'COMPUB',
          'PED',
          'Administración de Negocios',
          'Administración de Negocios Plan 2027',
          'PED',
          'PED',
          'ING',
        ][i],
        grupo: `${c} ${g}`,
      })),
    };
  return {
    schemaVersion: 1,
    tipo: type,
    ciclo: cycle,
    filas: [],
    imparticiones: [
      [
        '101.',
        'Seminario ficticio',
        'CONPUB',
        'CONPUB 11 04A',
        'PED 11 04A',
        '0001, 0003, tup0005, 999',
      ],
      ['102.', 'Gestión ficticia', 'MBA', 'MBA 24 04A', '', ''],
      ['103.', 'Inglés ficticio', 'ING-FCS', 'ING 11 01A', '', '0001'],
    ].map(([numero, materia, carrera, grupo, comparte, matriculas], i) => ({
      hoja: 'Asignaciones ficticias',
      fila: i + 7,
      cicloOrigen: c,
      numero,
      materia,
      carrera,
      grupo: `${c} ${grupo}`,
      comparte: comparte ? `${c} ${comparte}` : '',
      matriculas,
      celdaNumerica: false,
    })),
  };
}

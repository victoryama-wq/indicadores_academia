import { populationSample } from './population-fixtures';
import { crossPopulation, validRegistration } from './population';
import { parsePopulationSheets } from './population-import';
import { validateInput } from './input-validation';
function sources() {
  const roster = populationSample('saeko', 'p01'),
    catalog = populationSample('spai', 'p01');
  if (roster.tipo !== 'saeko' || catalog.tipo !== 'spai' || !catalog.imparticiones)
    throw Error('Muestra ficticia inválida');
  return { roster, catalog, rows: catalog.imparticiones };
}
describe('Población activa Saeko × imparticiones SPAI', () => {
  it('conserva procedencia, grupo compartido y otra carrera sin duplicar vínculos', () => {
    const { roster, catalog } = sources();
    const x = crossPopulation('p01', [roster, catalog])!;
    expect(x).toMatchObject({
      active: 7,
      covered: 5,
      uncovered: 1,
      byGroup: 4,
      byRegistration: 3,
      excludedCourses: 1,
      excludedStudents: 1,
    });
    expect(x.links).toHaveLength(6);
    const seminar = x.links.filter((l) => l.course.numero === '101.');
    expect(seminar).toHaveLength(4);
    expect([...seminar.find((l) => l.person.id === 'TUP0001')!.evidence]).toEqual([
      'Grupo base',
      'Matrícula explícita',
    ]);
    expect(seminar.find((l) => l.person.id === 'TUP0002')!.evidence.has('Comparte con')).toBe(true);
    const cross = seminar.find((l) => l.person.id === 'TUP0003')!;
    expect(cross.person.plan).toBe('MBA');
    expect(cross.course.carrera).toBe('CONPUB');
    expect(x.people[0].group).toContain('CONPUB');
    expect(x.people[0].source.grupo).toContain('COMPUB');
  });
  it('elige el plan MBA del padrón aun si comparten grupo y avanzan juntos de cuatrimestre', () => {
    const { roster, catalog, rows } = sources();
    for (const i of [2, 3]) roster.filas[i].grupo = '27-1 MBA 24 06B';
    rows[1].grupo = '27-1 MBA 24 06B';
    expect(
      crossPopulation('p01', [roster, catalog])!
        .links.filter((l) => l.course === rows[1])
        .map((l) => l.person.plan),
    ).toEqual(['MBA', 'MBA 2027']);
  });
  it('C.A no confirma por grupo base ni compartido y solo acepta matrículas explícitas', () => {
    const { roster, catalog, rows } = sources();
    rows[0].comparte += ', ' + roster.filas[5].grupo;
    rows[1].grupo = roster.filas[5].grupo;
    const x = crossPopulation('p01', [roster, catalog])!;
    expect(x.links.filter((l) => l.person.group.endsWith('C.A')).map((l) => l.person.id)).toEqual([
      'TUP0005',
    ]);
    expect(x.issues).toContainEqual(
      expect.objectContaining({
        fila: 7,
        motivo: expect.stringContaining('Asignación por confirmar (C.A'),
      }),
    );
  });
  it('confirma solo coincidencias únicas, sin inferir ceros ni equiparar celdas numéricas con texto', () => {
    const { roster, catalog, rows } = sources();
    roster.filas[4].matricula = ' tup0005 ';
    rows[0].matriculas = ' 0005 , 5, TUP0005X';
    let x = crossPopulation('p01', [roster, catalog])!;
    expect(x.links.some((l) => l.person.id === 'TUP0005')).toBe(true);
    expect(x.proposed[0].motivo).toContain('5 → TUP5');
    expect(x.issues.some((i) => i.motivo.includes('Formato de matrícula inválido'))).toBe(true);
    rows[0].celdaNumerica = true;
    rows[0].matriculas = '5';
    x = crossPopulation('p01', [roster, catalog])!;
    expect(x.links.some((l) => l.person.id === 'TUP0005')).toBe(false);
    expect(x.issues[0].motivo).toContain('Sin coincidencia exacta');
    expect(['TUP1.0', '123', 'TUP 12', 'TUP１２'].some(validRegistration)).toBe(false);
  });
  it('diferencia 0027 de 27 y acepta cinco o más dígitos sin convertirlos en números', () => {
    const { roster, catalog, rows } = sources();
    const digits = ['0027', '27', '12345', '0000012345'];
    digits.forEach((id, i) => {
      roster.filas[i].matricula = 'TUP' + id;
    });
    rows[0].matriculas = digits.join(';');
    const result = crossPopulation('p01', [roster, catalog])!;
    const matches = result.links.filter(
      (l) => l.course === rows[0] && l.evidence.has('Matrícula explícita'),
    );
    expect(matches.map((l) => l.person.id).sort()).toEqual(digits.map((d) => 'TUP' + d).sort());
  });

  it('no redondea una fracción a matrícula, ni confirma un número exacto con curso ambiguo', () => {
    const { roster, catalog, rows } = sources();
    roster.filas[4].matricula = 'TUP10201';
    rows[0].celdaNumerica = true;
    for (const raw of ['10201.00000000000000001', '-10201', '1020100000000000']) {
      rows[0].matriculas = raw;
      const x = crossPopulation('p01', [roster, catalog])!;
      expect(x.links.some((l) => l.person.id === 'TUP10201')).toBe(false);
      expect(x.issues.some((i) => i.motivo.includes('precisión fiable'))).toBe(true);
    }
    rows[0].matriculas = '1.0201E4';
    expect(
      crossPopulation('p01', [roster, catalog])!.links.some((l) => l.person.id === 'TUP10201'),
    ).toBe(true);
    rows.push({ ...rows[0], grupo: 'C.A', fila: 30 });
    const x = crossPopulation('p01', [roster, catalog])!;
    expect(x.links.some((l) => l.person.id === 'TUP10201')).toBe(false);
    expect(
      x.issues.some((i) => i.fila === 30 && i.motivo.includes('Localizador y título repetidos')),
    ).toBe(true);
  });
  it('rechaza un padrón ambiguo y una fecha de corte imposible antes de activar', () => {
    const { roster } = sources();
    roster.filas[1].matricula = ' tup0001 ';
    roster.fechaCorte = '2026-02-30';
    const x = validateInput(JSON.stringify(roster), 'saeko', 'p01');
    expect(x.batch).toBeNull();
    expect(x.errors).toContainEqual(
      expect.objectContaining({ fila: 3, motivo: expect.stringContaining('fila 2') }),
    );
    expect(x.errors).toContainEqual(
      expect.objectContaining({ fila: 0, motivo: expect.stringContaining('Fecha de corte') }),
    );
  });
  it('reserva para revisión el vínculo ambiguo cuando varias imparticiones comparten localizador y título', () => {
    const { roster, catalog, rows } = sources();
    rows.push({ ...rows[0], grupo: rows[1].grupo, fila: 20 });
    expect(validateInput(JSON.stringify(catalog), 'spai', 'p01').errors).toEqual([]);
    const x = crossPopulation('p01', [roster, catalog])!;
    expect(x.issues).toContainEqual(
      expect.objectContaining({
        fila: 20,
        motivo: expect.stringContaining('Localizador y título repetidos'),
      }),
    );
    expect(x.links.some((l) => l.person.id === 'TUP0003' && l.course.numero === '101.')).toBe(
      false,
    );
  });
  it('no cruza versiones de ciclos distintos ni interpreta la ausencia de fuente como cero', () => {
    const { roster } = sources();
    const catalog = populationSample('spai', 'p02');
    expect(crossPopulation('p01', [roster, catalog])).toMatchObject({
      active: 7,
      hasCourses: false,
      links: [],
    });
    expect(crossPopulation('p02', [roster, catalog])).toMatchObject({
      hasRoster: false,
      links: [],
    });
    expect(validateInput(JSON.stringify(roster), 'saeko', 'p02').batch).toBeNull();
  });
  it('lee encabezados XLSX sin segundo apellido y descarta las columnas no utilizadas', () => {
    const s = {
      sheet: 'Datos ficticios',
      data: [
        [
          'Matrícula',
          'Nombre completo',
          'Correo institucional',
          'Plan de estudios o curso',
          'Grupo',
          'Ciclo',
          'No importar',
        ],
        [
          ' tuP001 ',
          'Persona ficticia',
          'demo@example.invalid',
          'MBA',
          '27-1 MBA',
          'MAE 2027-01',
          'descartar',
        ],
      ],
    };
    const x = parsePopulationSheets([s], 'saeko', 'p01');
    expect(x.errors).toEqual([]);
    expect(JSON.stringify(x.batch)).not.toContain('descartar');
    expect(x.batch?.filas[0]).toMatchObject({ matricula: ' tuP001 ', hoja: s.sheet, fila: 2 });
    expect(parsePopulationSheets([s], 'saeko', 'p02').batch).toBeNull();
  });
});

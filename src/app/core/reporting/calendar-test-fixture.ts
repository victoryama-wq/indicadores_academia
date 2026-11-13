/** Synthetic dates/weights; only the layout follows the inspected reference. Never shipped as application data. */
export function calendarTestSheets() {
  const school: unknown[][] = [
    ['CALENDARIO OPERATIVO MOODLE MODALIDAD ESCOLARIZADA · CICLO 27-2 · MUESTRA FICTICIA'],
    [
      'PARCIALES',
      'UNIDAD',
      'ACTIVIDAD EN MOODLE',
      'PONDERACIÓN',
      'PERMITIR ENVIOS A PARTIR DE',
      'FECHA DE ENTREGA',
      'HORA',
      'FECHA DE CORTE',
      'HORA',
      'RECORDARME CALIFICAR EN MOODLE',
      'CAPTURA DE CALIFICACIONES EN SAEKO',
    ],
  ];
  const other: unknown[][] = [];
  const activities = ['ACTIVIDAD INTEGRADORA', 'FORO DE PARTICIPACIÓN', 'EXAMEN'];
  for (let unit = 1; unit <= 7; unit++)
    activities.forEach((activity, i) =>
      school.push([
        i === 0 ? `PARCIAL ${unit < 3 ? 1 : unit < 6 ? 2 : 3} | ${unit < 6 ? 30 : 40}%` : null,
        i === 0 ? 'UNIDAD ' + unit : null,
        activity,
        [25, 10, 15][i],
        '2027-01-12',
        `2027-02-${String(unit + 10).padStart(2, '0')}`,
        '23:59',
        `2027-02-${String(unit + 11).padStart(2, '0')}`,
        '23:59',
        'Recordatorio ficticio · interno',
        null,
      ]),
    );
  for (const [block, start] of [
    [1, 0],
    [2, 28],
    [3, 53],
  ] as const) {
    while (other.length < start) other.push([]);
    other.push([
      `CALENDARIO OPERATIVO MOODLE MODALIDAD EJECUTIVA, VIRTUAL Y POSGRADO\n27-2 MODULO ${block === 3 ? '1 y 2' : block} (ESTO SOLO PARA CLASES ${block === 3 ? 'PROFESIONALIZANTES' : 'TRANSVERSALES'}) · MUESTRA FICTICIA`,
    ]);
    other.push([
      'UNIDAD',
      'ACTIVIDAD EN MOODLE',
      'PONDERACIÓN',
      block === 3 ? 'PERMITIR ENVIOS A PARTIR DE' : 'APERTURA',
      block === 3 ? 'FECHA DE ENTREGA' : 'CIERRE',
      'HORA',
      'RECORDARME CALIFICAR EN MOODLE',
      'CAPTURA DE CALIFICACIONES EN SAEKO',
    ]);
    for (let unit = 1; unit <= 7; unit++)
      activities.forEach((activity, i) =>
        other.push([
          i === 0 ? 'UNIDAD ' + unit : null,
          activity,
          [7, 3, 4][i],
          `2027-0${block === 2 ? 3 : 1}-12`,
          `2027-0${block === 2 ? 4 : 2}-${String(unit + 10).padStart(2, '0')}`,
          '23:59',
          i === 0 ? 'Recordatorio ficticio · interno' : null,
          null,
        ]),
      );
  }
  return [
    { sheet: 'CALENDARIO OPERATIVO ESC-SALUD', data: school },
    { sheet: 'CALENDARIO VIRT, EJE, POSGRADO', data: other },
  ];
}

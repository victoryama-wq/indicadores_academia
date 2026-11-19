import assert from 'node:assert/strict';
import test from 'node:test';
import { classify, moodleReader } from './reader.mjs';
import { cotejarCurso } from './cotejar-curso.mjs';
import { pilotServer } from './pilot.mjs';

const users = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  email: 'tup' + String(i + 1).padStart(4, '0') + '@tecplayacar.edu.mx',
  fullname: 'Demo ' + (i + 1),
}));
const submissions = users
  .slice(0, 20)
  .map((u) => ({ userid: u.id, status: 'submitted', attemptnumber: 0 }));
const grades = users
  .slice(0, 18)
  .map((u) => ({ userid: u.id, grade: u.id === 1 ? '0.00000' : '8', attemptnumber: 0 }));
const id = 22041;
const activity = {
  id,
  cmid: 53765,
  name: 'Actividad Integradora | Unidad 1',
  teamsubmission: 0,
  nosubmissions: 0,
  blindmarking: 0,
  grade: 10,
};
const catalog = {
  courses: [
    { id: 4455, fullname: '603. Fundamentos De Contabilidad 27-1', assignments: [activity] },
  ],
  warnings: [],
};
const wrap = (field, rows) => ({
  assignments: [{ assignmentid: id, [field]: rows }],
  warnings: [],
});
const site = { userid: 900, version: '2025010100', release: 'Demo' };
const visible = (id, status = '') => ({
  id,
  submissionstatus: status,
  submitted: status === 'submitted',
});
const rows = users.map((u) => visible(u.id, u.id <= 20 ? 'submitted' : ''));
function evidence(userIds = users.map((u) => u.id)) {
  return {
    courseId: 4455,
    assignmentId: id,
    cmid: activity.cmid,
    serviceUserId: site.userid,
    version: site.version,
    userIds,
    verifiedAt: new Date(Date.now() - 60000).toISOString(),
    validUntil: new Date(Date.now() + 60000).toISOString(),
  };
}
function api(overrides = {}, readAudience) {
  const responses = {
    core_webservice_get_site_info: site,
    mod_assign_list_participants: rows,
    mod_assign_get_participant: { exception: 'denied' },
    mod_assign_get_assignments: catalog,
    core_enrol_get_enrolled_users: users,
    mod_assign_get_submissions: wrap('submissions', submissions),
    mod_assign_get_grades: wrap('grades', grades),
    ...overrides,
  };
  const calls = [];
  const request = async (url, options) => {
    assert.equal(new URL(url).pathname, '/webservice/rest/server.php');
    assert.equal(new URL(url).search, '');
    assert.equal(options.method, 'POST');
    const fn = options.body.get('wsfunction');
    assert.ok(Object.hasOwn(responses, fn));
    calls.push([fn, Object.fromEntries(options.body)]);
    const response = responses[fn];
    return Response.json(typeof response === 'function' ? response(options.body) : response);
  };
  const reader = moodleReader('ficticio', request, readAudience ? () => readAudience() : undefined);
  return { reader, calls, request };
}

test('Las fechas solo enriquecen sin entrega: normal, prórroga vigente, ajuste de grupo y sin fecha', async (t) => {
  const cut = new Date('2026-11-17T16:45:00Z');
  t.mock.timers.enable({ apis: ['Date'], now: cut });
  const due = cut.getTime() / 1000 - 3600;
  const groupDue = due + 86400;
  const extension = due + 7200;
  const fixture = api(
    {
      mod_assign_list_participants: rows.map((r) => ({ ...r, grantedextension: r.id === 22 })),
      mod_assign_get_participant: (params) => {
        assert.equal(params.get('assignid'), String(id));
        const user = Number(params.get('userid'));
        // Moodle ya resolvió el override del grupo del estudiante 23.
        return {
          ...visible(user),
          duedate: { 21: due, 23: groupDue, 24: 0 }[user],
          grantedextension: false,
          cutoffdate: due + 100000,
        };
      },
      mod_assign_get_user_flags: wrap('userflags', [{ userid: 22, extensionduedate: extension }]),
    },
    evidence,
  );
  const snap = await fixture.reader.snapshot(id);
  assert.equal(snap.readAt, cut.toISOString());
  assert.deepEqual(
    snap.students.filter((r) => r.state === 'sin-entrega').map((r) => r.dueDate),
    [due, extension, groupDue, 0],
  );
  assert.deepEqual(
    fixture.calls.filter(([fn]) => fn === 'mod_assign_get_participant').map(([, p]) => +p.userid),
    [21, 23, 24],
  );
  assert.equal(fixture.calls.filter(([fn]) => fn === 'mod_assign_get_user_flags').length, 1);
  assert.equal(snap.students.filter((r) => r.state === 'calificadas').length, 18);
  assert.equal(snap.students.filter((r) => r.state === 'pendientes').length, 2);
});

test('Una consulta de prórrogas denegada mantiene al estudiante sin entrega y su atraso por confirmar', async () => {
  const due = 1794931200;
  const fixture = api(
    {
      mod_assign_get_participant: (params) => {
        const user = Number(params.get('userid'));
        return { ...visible(user), grantedextension: user === 22, duedate: due };
      },
      mod_assign_get_user_flags: {
        exception: 'webservice_access_exception',
        errorcode: 'nopermissions',
      },
    },
    evidence,
  );
  const snap = await fixture.reader.snapshot(id);
  assert.deepEqual(
    snap.students
      .filter((row) => row.state === 'sin-entrega')
      .map((row) => [row.registration, row.dueDate]),
    [
      ['TUP0021', due],
      ['TUP0022', null],
      ['TUP0023', due],
      ['TUP0024', due],
    ],
  );
  assert.equal(fixture.calls.filter(([fn]) => fn === 'mod_assign_get_user_flags').length, 1);
});

test('Permiso denegado, ID ajeno, prórroga sin fecha y campos ausentes conservan las filas', async () => {
  const snap = await api(
    {
      mod_assign_get_participant: (params) => {
        const user = +params.get('userid');
        if (user === 21) return { exception: 'denied' };
        if (user === 22) return { ...visible(5), grantedextension: false, duedate: 12 };
        if (user === 23) return { ...visible(user), grantedextension: true, duedate: 12 };
        return { ...visible(user), grantedextension: false, gradingduedate: 100, cutoffdate: 300 };
      },
      mod_assign_get_user_flags: wrap('userflags', [{ userid: 21, extensionduedate: 90 }]),
    },
    evidence,
  ).reader.snapshot(id);
  assert.deepEqual(
    snap.students.filter((r) => r.state === 'sin-entrega').map((r) => r.dueDate),
    [null, null, null, null],
  );
});

test('El diagnóstico separa la muestra visible del cotejo y respeta funciones ausentes', async () => {
  const fixture = api({ core_webservice_get_site_info: { ...site, functions: [] } });
  const result = await fixture.reader.probeDueDates(id);
  assert.match(result.mode, /sin cotejo vigente/);
  assert.equal(result.assessed, 1);
  assert.equal(result.confirmed, 0);
  assert.deepEqual(
    result.functions.map(([, status]) => status),
    ['no', 'no'],
  );
  assert.ok(
    !fixture.calls.some(([fn]) =>
      ['mod_assign_get_participant', 'mod_assign_get_user_flags'].includes(fn),
    ),
  );
  assert.equal(JSON.stringify(result).includes('TUP'), false);
});

test('Un cotejo de curso completo usa el padrón activo y verifica cada identidad y estado de la tarea', async () => {
  const until = new Date(Date.now() + 60000).toISOString();
  const fixture = api({
    core_enrol_get_enrolled_users: [...users, { id: site.userid, username: 'TUP0900' }],
    mod_assign_list_participants: [...rows, visible(site.userid)],
  });
  const result = await cotejarCurso('ficticio', id, 24, until, fixture.request);
  assert.deepEqual(
    result.evidence.userIds,
    users.map((u) => u.id),
  );
  assert.deepEqual(
    result.snapshot.students
      .filter((r) => r.state === 'sin-entrega')
      .map((r) => r.registration)
      .sort(),
    ['TUP0021', 'TUP0022', 'TUP0023', 'TUP0024'],
  );
  for (const response of [
    rows.slice(1),
    [...rows.slice(1), visible(47)],
    [...rows.slice(0, 23), visible(24, 'draft')],
  ]) {
    await assert.rejects(
      cotejarCurso(
        'ficticio',
        id,
        24,
        until,
        api({ mod_assign_list_participants: response }).request,
      ),
      /Cotejo incompleto/,
    );
  }
  await assert.rejects(
    cotejarCurso('ficticio', id, 23, until, fixture.request),
    /Cotejo incompleto/,
  );
});

test('Un alta en el curso invalida el cotejo completo aunque la tabla de la tarea no la muestre', async () => {
  const until = new Date(Date.now() + 60000).toISOString();
  const { evidence: saved } = await cotejarCurso(
    'ficticio',
    id,
    users.length,
    until,
    api().request,
  );
  const { reader } = api(
    {
      core_enrol_get_enrolled_users: [...users, { id: 47, username: 'TUP0047' }],
    },
    () => saved,
  );
  const snapshot = await reader.snapshot(id);
  assert.equal(snapshot.expectedCount, null);
  assert.equal(snapshot.students.filter((row) => row.state === 'sin-entrega').length, 0);
  assert.equal(snapshot.students.filter((row) => row.state === 'calificadas').length, 18);
});

test('El curso y la tarea usan sus propios identificadores y los totales salen de las filas individuales', async () => {
  const { reader, calls } = api({}, evidence);

  const result = await reader.snapshot(id);
  assert.equal(result.activity.cmid, 53765);
  assert.equal(result.students.length, 24);
  assert.equal(result.identifiedCount, 24);
  assert.equal(result.expectedCount, 24);
  assert.deepEqual(
    ['calificadas', 'pendientes', 'sin-entrega'].map(
      (s) => result.students.filter((r) => r.state === s).length,
    ),
    [18, 2, 4],
  );
  assert.equal(result.students.find((r) => r.registration === 'TUP0001').state, 'calificadas');
  assert.equal(calls[0][1]['courseids[0]'], '4455');
  assert.equal(
    calls.find(([fn]) => fn === 'core_enrol_get_enrolled_users')[1]['options[0][name]'],
    'onlyactive',
  );
  assert.equal(
    calls.find(([fn]) => fn === 'mod_assign_get_submissions')[1]['assignmentids[0]'],
    String(id),
  );
  assert.equal(JSON.stringify(result).includes('tecplayacar.edu.mx'), false);
});
test('La matrícula de curso y la visibilidad técnica no prueban el alcance de la tarea', async () => {
  const result = await api().reader.snapshot(id);
  assert.equal(result.identifiedCount, 24);
  assert.equal(result.expectedCount, null);
  assert.ok(result.scopeReason);
  assert.equal(result.students.length, 20);
  assert.equal(result.students.filter((row) => row.state === 'sin-entrega').length, 0);
  assert.equal(result.students.filter((row) => row.state === 'calificadas').length, 18);
});

test('Una población verificada de grupo excluye a los demás, incluso después de actualizar', async () => {
  let audience = evidence([1, 2]);
  const { reader } = api(
    {
      core_enrol_get_enrolled_users: users.slice(0, 3),
      mod_assign_list_participants: [visible(1, 'submitted'), visible(2)],
      mod_assign_get_submissions: wrap('submissions', submissions.slice(0, 1)),
      mod_assign_get_grades: wrap('grades', grades.slice(0, 1)),
    },
    () => audience,
  );
  const group = await reader.snapshot(id);
  assert.equal(group.identifiedCount, 3);
  assert.equal(group.expectedCount, 2);
  assert.deepEqual(
    group.students.map((r) => [r.registration, r.state]),
    [
      ['TUP0001', 'calificadas'],
      ['TUP0002', 'sin-entrega'],
    ],
  );
  audience = evidence([3]);
  const conflicting = await reader.snapshot(id);
  assert.equal(conflicting.expectedCount, null);
  assert.match(conflicting.scopeReason, /difieren/);
  assert.deepEqual(
    conflicting.students.map((r) => r.state),
    ['calificadas'],
  );
});

for (const present of [true, false]) {
  test(
    'Cuatro identidades sin entrega con la cuenta técnica ' + (present ? 'presente' : 'ausente'),
    async () => {
      const technical = { id: site.userid, username: 'tup00001', fullname: users[0].fullname };
      const { reader, calls } = api(
        {
          core_enrol_get_enrolled_users: [...users, technical],
          mod_assign_list_participants: present ? [...rows, visible(technical.id)] : rows,
        },
        evidence,
      );
      const snap = await reader.snapshot(id);
      assert.equal(snap.identifiedCount, 24);
      assert.equal(snap.expectedCount, 24);
      assert.equal(snap.unidentified, 0);
      assert.deepEqual(
        snap.students
          .filter((s) => s.state === 'sin-entrega')
          .map((s) => s.registration)
          .sort(),
        ['TUP0021', 'TUP0022', 'TUP0023', 'TUP0024'],
      );
      assert.equal(snap.students.find((s) => s.registration === 'TUP0001').state, 'calificadas');
      assert.equal(
        snap.students.some((s) => s.registration === 'TUP00001'),
        false,
      );
      const params = calls.find(([fn]) => fn === 'mod_assign_list_participants')[1];
      assert.deepEqual(
        [params.assignid, params.groupid, params.filter, params.skip, params.limit],
        [String(id), '0', '', '0', '0'],
      );
    },
  );
}
test('Una lectura parcial o no autorizada conserva la evidencia directa y oculta faltantes', async () => {
  for (const partial of [
    rows.slice(1),
    [...rows.slice(1), visible(99)],
    [...rows, rows[0]],
    rows.map((r) => (r.id === 24 ? { id: 24, submitted: false } : r)),
    rows.map((r) => (r.id === 24 ? visible(24, 'draft') : r)),
    { exception: 'denied' },
  ]) {
    const snap = await api({ mod_assign_list_participants: partial }, evidence).reader.snapshot(id);
    assert.equal(snap.expectedCount, null);
    assert.ok(snap.scopeReason);
    assert.equal(snap.students.filter((s) => s.state === 'sin-entrega').length, 0);
    assert.equal(snap.students.filter((s) => s.state === 'calificadas').length, 18);
    assert.equal(snap.students.filter((s) => s.state === 'pendientes').length, 2);
  }
});
test('El cotejo está ligado a versión, cuenta, curso, módulo, tarea y vigencia', async () => {
  for (const change of [
    { version: 'otra' },
    { serviceUserId: 2 },
    { courseId: 2 },
    { cmid: 2 },
    { assignmentId: 2 },
    { validUntil: '2020-01-01T00:00:00Z' },
  ]) {
    const snap = await api({}, () => ({ ...evidence(), ...change })).reader.snapshot(id);
    assert.equal(snap.expectedCount, null);
  }
});
test('Cada corte relee entregas, borradores y casos por revisar de los destinatarios', async () => {
  const liveRows = rows.map((row) => ({ ...row }));
  const liveSubmissions = [...submissions];
  const { reader } = api(
    {
      mod_assign_list_participants: liveRows,
      mod_assign_get_submissions: wrap('submissions', liveSubmissions),
    },
    evidence,
  );
  const initial = await reader.snapshot(id);
  for (const [userId, status] of [
    [21, 'submitted'],
    [22, 'draft'],
    [23, 'reopened'],
  ]) {
    liveRows[userId - 1] = visible(userId, status);
    liveSubmissions.push({ userid: userId, status, attemptnumber: 1 });
  }
  const updated = await reader.snapshot(id);
  assert.deepEqual(
    updated.students.filter((s) => s.state === 'sin-entrega').map((s) => s.registration),
    ['TUP0024'],
  );
  assert.equal(updated.students.filter((s) => s.state === 'pendientes').length, 3);
  assert.equal(updated.students.find((s) => s.registration === 'TUP0022').state, 'borradores');
  assert.equal(updated.students.find((s) => s.registration === 'TUP0023').state, 'revisar');
  assert.equal(initial.students.filter((s) => s.state === 'sin-entrega').length, 4);
});
test('Una identidad de servicio no verificable impide atribuir resultados académicos', async () => {
  await assert.rejects(
    api({ core_webservice_get_site_info: { version: site.version } }).reader.snapshot(id),
    /incompletos/,
  );
});
test('Una nota de un intento previo no califica la nueva entrega y el borrador sigue separado', () => {
  const newer = [
    { userid: 1, attemptnumber: 1, status: 'submitted' },
    { userid: 2, attemptnumber: 1, status: 'draft' },
  ];
  const { students } = classify(
    users.slice(0, 2),
    [...submissions.slice(0, 2), ...newer],
    grades.slice(0, 1),
  );
  assert.deepEqual(
    students.map((r) => r.state),
    ['pendientes', 'borradores'],
  );
});
test('Una nota vacía o -1 no califica, una nota sin envío requiere revisión', () => {
  const marked = [' ', '-1', '8'].map((grade, i) => ({ userid: i + 1, attemptnumber: 0, grade }));
  assert.deepEqual(
    classify(users.slice(0, 3), submissions.slice(0, 2), marked).students.map((r) => r.state),
    ['pendientes', 'pendientes', 'revisar'],
  );
});
test('Cuenta las identidades fuera del patrón y rechaza matrículas duplicadas', () => {
  const teacher = { id: 998, email: 'docente@example.test' };
  assert.equal(classify([...users, teacher], [], []).unidentified, 1);
  assert.throws(() => classify([users[0], { ...users[0], id: 998 }], [], []));
});
test('Moodle puede devolver un aviso específico por falta de registros', async () => {
  const warning = (item) => [{ item, itemid: id, warningcode: '3' }];
  const { reader } = api(
    {
      mod_assign_list_participants: users.map((u) => visible(u.id)),
      mod_assign_get_grades: { assignments: [], warnings: warning('assignment') },
      mod_assign_get_submissions: { ...wrap('submissions', []), warnings: warning('module') },
    },
    evidence,
  );
  assert.equal(
    (await reader.snapshot(id)).students.filter((r) => r.state === 'sin-entrega').length,
    24,
  );
});
test('Permisos insuficientes, excepciones y ausencia inexplicada del bloque interrumpen el indicador', async () => {
  for (const override of [
    {
      mod_assign_get_submissions: {
        assignments: [],
        warnings: [{ item: 'assignment', itemid: id, warningcode: '1' }],
      },
    },
    { mod_assign_get_grades: { assignments: [], warnings: [] } },
    { mod_assign_get_grades: wrap('grades', [{ userid: 1, attemptnumber: 0 }]) },
    { core_enrol_get_enrolled_users: { exception: 'accessexception', errorcode: 'denied' } },
  ])
    await assert.rejects(api(override).reader.snapshot(id));
});
test('Únicamente permite tareas del curso confirmado y aptas para seguimiento individual', async () => {
  const bad = api();
  await assert.rejects(bad.reader.snapshot(53765));
  assert.equal(bad.calls.length, 1);
  for (const variant of [{ teamsubmission: 1 }, { blindmarking: 1 }, { nosubmissions: 1 }]) {
    const restricted = api({
      mod_assign_get_assignments: {
        courses: [{ ...catalog.courses[0], assignments: [{ ...activity, ...variant }] }],
      },
    });
    await assert.rejects(restricted.reader.snapshot(id));
    assert.equal(restricted.calls.length, 1);
  }
});
test('La API local protege los datos antes de contactar a Moodle', async (t) => {
  const { reader, calls } = api();
  const server = pilotServer(reader, 'clave-ficticia');
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/moodle/actividades';
  const options = { headers: { authorization: 'Bearer clave-ficticia' } };
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (await fetch(url, { headers: { ...options.headers, origin: 'https://ejemplo.test' } })).status,
    403,
  );
  assert.equal((await fetch(url, { ...options, method: 'POST' })).status, 405);
  assert.equal(calls.length, 0);
  const ok = await fetch(url, options);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store');
  assert.equal((await ok.json()).courseId, 4455);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { classify, moodleReader } from './reader.mjs';
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
function api(overrides = {}, readAudience) {
  const responses = {
    mod_assign_get_assignments: catalog,
    core_enrol_get_enrolled_users: users,
    mod_assign_get_submissions: wrap('submissions', submissions),
    mod_assign_get_grades: wrap('grades', grades),
    ...overrides,
  };
  const calls = [];
  const reader = moodleReader(
    'ficticio',
    async (url, options) => {
      assert.equal(new URL(url).pathname, '/webservice/rest/server.php');
      assert.equal(new URL(url).search, '');
      assert.equal(options.method, 'POST');
      const fn = options.body.get('wsfunction');
      assert.ok(Object.hasOwn(responses, fn));
      calls.push([fn, Object.fromEntries(options.body)]);
      return Response.json(responses[fn]);
    },
    readAudience,
  );
  return { reader, calls };
}

test('El curso y la tarea usan sus propios identificadores y los totales salen de las filas individuales', async () => {
  const { reader, calls } = api({}, ({ courseId, assignmentId, cmid }) => {
    assert.deepEqual([courseId, assignmentId, cmid], [4455, id, activity.cmid]);
    return { kind: 'course' };
  });
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
  let audience = { kind: 'restricted', userIds: [1, 2] };
  const { reader } = api(
    {
      core_enrol_get_enrolled_users: users.slice(0, 3),
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
  audience = { kind: 'restricted', userIds: [3] };
  const conflicting = await reader.snapshot(id);
  assert.equal(conflicting.expectedCount, null);
  assert.match(conflicting.scopeReason, /fuera/);
  assert.deepEqual(
    conflicting.students.map((r) => r.state),
    ['calificadas'],
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
      mod_assign_get_grades: { assignments: [], warnings: warning('assignment') },
      mod_assign_get_submissions: { ...wrap('submissions', []), warnings: warning('module') },
    },
    () => ({ kind: 'course' }),
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

const endpoint = 'https://moodle2.tecplayacar.edu.mx/webservice/rest/server.php';
const courseId = 4455;
const invalid = () =>
  new Error('Moodle devolvió datos incompletos. Revisa el alcance de lectura del servicio.');

function list(value) {
  if (!Array.isArray(value)) throw invalid();
  return value;
}

export function moodleReader(token, request = fetch) {
  async function read(fn, params, emptyWarning) {
    let result;
    try {
      const response = await request(endpoint, {
        method: 'POST',
        body: new URLSearchParams({
          ...params,
          wsfunction: fn,
          moodlewsrestformat: 'json',
          wstoken: token,
        }),
        redirect: 'error',
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw invalid();
      result = await response.json();
    } catch {
      throw new Error('No se pudo consultar Moodle. Comprueba la conexión e inténtalo nuevamente.');
    }
    if (
      !result ||
      typeof result !== 'object' ||
      result.exception ||
      result.errorcode ||
      list(result.warnings ?? []).some((w) => !emptyWarning?.(w))
    ) {
      throw new Error(
        'Consulta incompleta en ' + fn + '. Revisa el servicio y los permisos de la cuenta.',
      );
    }
    return result;
  }

  async function catalog() {
    const result = await read('mod_assign_get_assignments', { 'courseids[0]': String(courseId) });
    const course = list(result.courses).find((c) => c.id === courseId);
    if (
      !course ||
      !/^603\.\s*fundamentos de contabilidad\s+27-1$/iu.test(course.fullname?.trim())
    ) {
      throw new Error('El curso visible no coincide con el curso y ciclo del piloto.');
    }
    const activities = list(course.assignments).map((a) => {
      if (!Number.isSafeInteger(a.id) || !Number.isSafeInteger(a.cmid) || !a.name) throw invalid();
      return {
        id: a.id,
        cmid: a.cmid,
        name: a.name,
        supported:
          a.teamsubmission === 0 &&
          a.nosubmissions === 0 &&
          (a.blindmarking === 0 || a.revealidentities === 1) &&
          a.grade > 0,
      };
    });
    return { course: course.fullname, courseId, activities };
  }

  async function snapshot(id) {
    const context = await catalog();
    const activity = context.activities.find((a) => a.id === id);
    if (!activity?.supported)
      throw new Error('Esta actividad no admite el seguimiento individual del piloto.');
    const filter = { 'assignmentids[0]': String(id) };
    const empty = (item) => (w) =>
      String(w.warningcode) === '3' && w.item === item && Number(w.itemid) === id;
    const [users, deliveries, marks] = await Promise.all([
      read('core_enrol_get_enrolled_users', {
        courseid: String(courseId),
        'options[0][name]': 'onlyactive',
        'options[0][value]': '1',
      }),
      read('mod_assign_get_submissions', filter, empty('module')),
      read('mod_assign_get_grades', filter, empty('assignment')),
    ]);
    function records(envelope, field) {
      const blocks = list(envelope.assignments);
      if (!blocks.length && field === 'grades' && envelope.warnings?.some(empty('assignment')))
        return [];
      if (blocks.length !== 1 || blocks[0].assignmentid !== id) throw invalid();
      return list(blocks[0][field]);
    }
    return {
      course: context.course,
      activity,
      ...classify(list(users), records(deliveries, 'submissions'), records(marks, 'grades')),
      readAt: new Date().toISOString(),
    };
  }
  return { catalog, snapshot };
}

function latestByUser(rows) {
  const result = new Map();
  for (const row of rows) {
    if (
      !Number.isSafeInteger(row.userid) ||
      row.userid <= 0 ||
      !Number.isSafeInteger(row.attemptnumber) ||
      row.attemptnumber < 0
    )
      throw invalid();
    const old = result.get(row.userid);
    if (old && old.attemptnumber === row.attemptnumber) throw invalid();
    if (!old || row.attemptnumber > old.attemptnumber) result.set(row.userid, row);
  }
  return result;
}

export function classify(users, submissions, grades) {
  const sent = latestByUser(submissions);
  const marks = latestByUser(grades);
  const students = [];
  const ids = new Set(),
    registrations = new Set();
  let unidentified = 0;
  for (const user of users) {
    const email = /^(tup\d+)@tecplayacar\.edu\.mx$/i
      .exec(user.email?.trim() ?? '')?.[1]
      ?.toUpperCase();
    const username = /^tup\d+$/i.test(user.username ?? '')
      ? user.username.toUpperCase()
      : undefined;
    if (email && username && email !== username) throw invalid();
    const registration = email ?? username;
    if (!registration) {
      unidentified++;
      continue;
    }
    if (!Number.isSafeInteger(user.id) || ids.has(user.id) || registrations.has(registration))
      throw invalid();
    ids.add(user.id);
    registrations.add(registration);
    const submission = sent.get(user.id),
      grade = marks.get(user.id);
    const raw = grade?.grade;
    const value = raw == null || String(raw).trim() === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) throw invalid();
    const graded = value !== null && value >= 0;
    let state = 'revisar';
    if (submission?.status === 'submitted') {
      if (!grade || grade.attemptnumber === submission.attemptnumber)
        state = graded ? 'calificadas' : 'pendientes';
      else if (grade.attemptnumber < submission.attemptnumber) state = 'pendientes';
    } else if (!graded && (!submission || submission.status === 'new')) state = 'sin-entrega';
    else if (!graded && submission?.status === 'draft') state = 'borradores';
    students.push({
      registration,
      name: user.fullname || registration,
      state,
      updatedAt:
        submission?.timemodified > 0
          ? new Date(submission.timemodified * 1000).toISOString()
          : null,
    });
  }
  if (!students.length && unidentified)
    throw new Error(
      'Ningún participante tiene una matrícula visible. Verifica los campos autorizados.',
    );
  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { students, unidentified };
}

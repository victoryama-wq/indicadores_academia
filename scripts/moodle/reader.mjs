import { effectiveDueDates } from './due-dates.mjs';

const endpoint = 'https://moodle2.tecplayacar.edu.mx/webservice/rest/server.php';
const accessPending = () => new Error('Curso localizado · acceso a entregas pendiente');
const invalid = () =>
  new Error('Moodle devolvió datos incompletos. Revisa el alcance de lectura del servicio.');

function list(value) {
  if (!Array.isArray(value)) throw invalid();
  return value;
}

export function moodleReader(token, request = fetch, readAudience) {
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
      const denied = [
        'accessexception',
        'webservice_access_exception',
        'nopermissions',
        'required_capability_exception',
      ];
      if (
        [
          'mod_assign_get_assignments',
          'mod_assign_get_submissions',
          'mod_assign_get_grades',
          'core_enrol_get_enrolled_users',
        ].includes(fn) &&
        (denied.includes(result?.errorcode) ||
          denied.includes(result?.exception) ||
          result?.warnings?.some?.((w) => ['1', '2'].includes(String(w.warningcode))))
      )
        throw accessPending();
      const reason = [
        'accessexception',
        'webservice_access_exception',
        'invalidtoken',
        'invalidparameter',
        'nopermissions',
        'requireloginerror',
      ].includes(result?.errorcode)
        ? ' (' + result.errorcode + ')'
        : '';
      throw new Error(
        'Consulta incompleta en ' +
          fn +
          reason +
          '. Revisa el servicio y los permisos de la cuenta.',
      );
    }
    return result;
  }

  async function siteInfo() {
    const site = await read('core_webservice_get_site_info', {});
    if (!Number.isSafeInteger(site.userid) || site.userid < 1) throw invalid();
    return site;
  }

  function participants(id) {
    return read('mod_assign_list_participants', {
      assignid: String(id),
      groupid: '0',
      filter: '',
      skip: '0',
      limit: '0',
      onlyids: '1',
      includeenrolments: '0',
      tablesort: '0',
    });
  }

  async function searchCourses(cycle) {
    const result = await read('core_course_search_courses', {
      criterianame: 'search',
      criteriavalue: cycle,
      perpage: '0',
    });
    const courses = list(result.courses);
    if (
      result.total !== courses.length ||
      courses.some(
        (c) => !Number.isSafeInteger(c?.id) || c.id < 1 || typeof c.fullname !== 'string',
      ) ||
      new Set(courses.map((c) => c.id)).size !== courses.length
    )
      throw invalid();
    return courses.map(({ id, fullname }) => ({ id, fullname }));
  }

  async function catalog(link) {
    const courseId = link?.courseId;
    if (!Number.isSafeInteger(courseId) || courseId < 1)
      throw new Error('El curso requiere un vínculo válido.');
    // Moodle 4.5 can omit individual modules from an otherwise accessible course.
    const restrictedModule = (w) =>
      w?.item === 'module' &&
      String(w.warningcode) === '1' &&
      Number.isSafeInteger(w.itemid) &&
      w.itemid > 0;
    const result = await read(
      'mod_assign_get_assignments',
      { 'courseids[0]': String(courseId) },
      restrictedModule,
    );
    const course = list(result.courses).find((c) => c.id === courseId);
    if (!course) throw accessPending();
    if (typeof course.fullname !== 'string' || (link.fullname && course.fullname !== link.fullname))
      throw new Error('El curso cambió desde la vinculación. Revisa la versión SPAI en Insumos.');
    const restricted = new Set((result.warnings ?? []).map((w) => w.itemid));
    const activities = list(course.assignments).map((a) => {
      if (!Number.isSafeInteger(a.id) || !Number.isSafeInteger(a.cmid) || !a.name) throw invalid();
      if (restricted.has(a.cmid)) throw invalid();
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
    if (restricted.size && !activities.length)
      throw new Error(
        'Curso localizado · acceso a entregas pendiente. Moodle devolvió el curso, pero omitió sus tareas por restricciones de acceso. Comprueba la visibilidad de la sección y el permiso mod/assign:view de la cuenta técnica en la actividad.',
      );
    return {
      course: course.fullname,
      courseId,
      activities,
      hasRestrictedActivities: restricted.size > 0,
    };
  }

  async function snapshot(id, link) {
    const context = await catalog(link);
    const { courseId } = context;
    const activity = context.activities.find((a) => a.id === id);
    if (!activity?.supported)
      throw new Error('Esta actividad no admite el seguimiento individual del piloto.');
    const filter = { 'assignmentids[0]': String(id) };
    const empty = (item) => (w) =>
      String(w.warningcode) === '3' && w.item === item && Number(w.itemid) === id;
    const [users, deliveries, marks, site] = await Promise.all([
      read('core_enrol_get_enrolled_users', {
        courseid: String(courseId),
        'options[0][name]': 'onlyactive',
        'options[0][value]': '1',
      }),
      read('mod_assign_get_submissions', filter, empty('module')),
      read('mod_assign_get_grades', filter, empty('assignment')),
      siteInfo(),
    ]);
    function records(envelope, field) {
      const blocks = list(envelope.assignments);
      if (!blocks.length && field === 'grades' && envelope.warnings?.some(empty('assignment')))
        return [];
      if (blocks.length !== 1 || blocks[0].assignmentid !== id) throw invalid();
      return list(blocks[0][field]);
    }
    const submissions = records(deliveries, 'submissions');
    const academicUsers = list(users).filter((user) => user.id !== site.userid);
    let audience;
    let rows;
    try {
      rows = await participants(id);
      const activeUserIds = academicUsers.filter(registrationOf).map((u) => u.id);
      const evidence = await readAudience?.({
        courseId,
        activity,
        site,
        activeUserIds,
      });
      audience = verifiedAudience(
        rows,
        submissions,
        site,
        activity,
        evidence,
        activeUserIds,
        courseId,
      );
    } catch {
      audience = {
        reason: 'No se pudo verificar la tabla de participantes de la tarea o su cotejo local.',
      };
    }
    const result = classify(academicUsers, submissions, records(marks, 'grades'), audience);
    const missing = result.students.filter((row) => row.state === 'sin-entrega');
    if (missing.length) {
      const ids = new Map(academicUsers.map((u) => [registrationOf(u), u.id]));
      const missingIds = new Set(missing.map((row) => ids.get(row.registration)));
      const dates = await effectiveDueDates(
        read,
        id,
        rows.filter((row) => missingIds.has(row.id)),
        site.functions,
      );
      for (const row of missing) row.dueDate = dates.get(ids.get(row.registration)) ?? null;
    }
    return {
      course: context.course,
      courseId,
      activity,
      ...result,
      readAt: new Date().toISOString(),
    };
  }
  async function probeDueDates(id, userId, link) {
    const site = await siteInfo();
    const activity = (await catalog(link)).activities.find((a) => a.id === id && a.supported);
    if (!activity) throw new Error('Selecciona una tarea individual del catálogo del piloto.');
    const functions = ['mod_assign_get_participant', 'mod_assign_get_user_flags'].map((name) => [
      name,
      Array.isArray(site.functions)
        ? site.functions.some((fn) => fn.name === name)
          ? 'sí'
          : 'no'
        : 'sin información',
    ]);
    if (userId === undefined) {
      const result = await snapshot(id, link);
      const missing = result.students.filter((row) => row.state === 'sin-entrega');
      if (result.expectedCount !== null)
        return {
          functions,
          mode: 'cotejo vigente',
          assessed: missing.length,
          confirmed: missing.filter((row) => row.dueDate !== null).length,
        };
      const sample = list(await participants(id)).find(
        (r) =>
          r.id !== site.userid &&
          Number.isSafeInteger(r.id) &&
          r.id > 0 &&
          [false, 0].includes(r.submitted) &&
          ['', 'new'].includes(r.submissionstatus),
      );
      if (!sample)
        return {
          functions,
          mode: 'sin cotejo vigente ni fila de prueba',
          assessed: 0,
          confirmed: 0,
        };
      const dates = await effectiveDueDates(read, id, [sample], site.functions);
      return {
        functions,
        mode: 'muestra técnica de una fila visible; población sin cotejo vigente',
        assessed: 1,
        confirmed: dates.get(sample.id) != null ? 1 : 0,
      };
    }
    if (!Number.isSafeInteger(userId) || userId <= 0 || userId === site.userid) throw invalid();
    const row = list(await participants(id)).find(
      (r) =>
        r.id === userId &&
        [false, 0].includes(r.submitted) &&
        ['', 'new'].includes(r.submissionstatus),
    );
    if (!row) throw new Error('La fila indicada no figura con estado vacío o nuevo en la tarea.');
    const dates = await effectiveDueDates(read, id, [row], site.functions);
    return {
      functions,
      mode: 'fila indicada por Sistemas',
      assessed: 1,
      confirmed: dates.get(userId) != null ? 1 : 0,
    };
  }
  return { searchCourses, catalog, snapshot, siteInfo, participants, probeDueDates };
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

// La tabla visible puede omitir grupos o incluir personas ajenas a una restricción.
function verifiedAudience(rows, submissions, site, activity, evidence, activeUserIds, courseId) {
  if (!Array.isArray(rows)) throw invalid();
  if (
    !evidence ||
    evidence.courseId !== courseId ||
    evidence.assignmentId !== activity.id ||
    evidence.cmid !== activity.cmid ||
    evidence.serviceUserId !== site.userid ||
    !site.version ||
    String(site.version) !== evidence.version ||
    !(Date.parse(evidence.verifiedAt) <= Date.now() && Date.now() < Date.parse(evidence.validUntil))
  ) {
    return {
      reason:
        'Falta un cotejo vigente de restricciones, grupos y destinatarios de esta tarea para esta cuenta y versión de Moodle.',
    };
  }
  const expectedIds = new Set(list(evidence.userIds));
  if (
    expectedIds.size !== evidence.userIds.length ||
    expectedIds.has(site.userid) ||
    [...expectedIds].some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw invalid();
  if (
    evidence.scope === 'course' &&
    (activeUserIds.length !== expectedIds.size || activeUserIds.some((id) => !expectedIds.has(id)))
  ) {
    return {
      reason: 'La matrícula activa del curso cambió. Se requiere un nuevo cotejo de la tarea.',
    };
  }
  const seen = new Set();
  const deliveries = latestByUser(submissions);
  for (const row of rows) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || seen.has(row.id)) throw invalid();
    seen.add(row.id);
    if (row.id === site.userid) continue;
    if (!expectedIds.has(row.id))
      return { reason: 'Los destinatarios cotejados y la tabla visible de Moodle difieren.' };
    const status = row.submissionstatus;
    const direct = deliveries.get(row.id);
    // Moodle usa cadena vacía para quien nunca inició un envío.
    if (
      !['', 'new', 'draft', 'submitted', 'reopened'].includes(status) ||
      ![true, false, 0, 1].includes(row.submitted) ||
      Boolean(row.submitted) !== (status === 'submitted') ||
      (direct ? direct.status !== status : status !== '' && status !== 'new')
    ) {
      return {
        reason: 'El estado de algún destinatario está incompleto o cambió entre consultas.',
      };
    }
  }
  if ([...expectedIds].some((id) => !seen.has(id))) {
    return { reason: 'La cuenta no devolvió a todos los destinatarios cotejados.' };
  }
  return { kind: 'restricted', userIds: [...expectedIds] };
}

function registrationOf(user) {
  const email = /^(tup\d+)@tecplayacar\.edu\.mx$/i
    .exec(user.email?.trim() ?? '')?.[1]
    ?.toUpperCase();
  const username = /^tup\d+$/i.test(user.username ?? '') ? user.username.toUpperCase() : undefined;
  if (email && username && email !== username) throw invalid();
  return email ?? username;
}

export function classify(users, submissions, grades, audience) {
  const sent = latestByUser(submissions);
  const marks = latestByUser(grades);
  // Solo una fuente que acredite el alcance completo puede suministrar esta población.
  const courseWide = audience?.kind === 'course';
  const included = audience?.kind === 'restricted' ? new Set(list(audience.userIds)) : null;
  const identified = [];
  const ids = new Set(),
    registrations = new Set();
  let unidentified = 0;
  for (const user of users) {
    const registration = registrationOf(user);
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
    if (grade && !Object.hasOwn(grade, 'grade')) throw invalid();
    const raw = grade?.grade;
    const value = raw == null || String(raw).trim() === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) throw invalid();
    const graded = value !== null && value >= 0;
    let state = 'revisar';
    if (submission?.status === 'submitted') {
      if (!grade || grade.attemptnumber === submission.attemptnumber)
        state = graded ? 'calificadas' : 'pendientes';
      else if (grade.attemptnumber < submission.attemptnumber) state = 'pendientes';
    } else if (!graded && (!submission || submission.status === 'new')) state = null;
    else if (!graded && submission?.status === 'draft') state = 'borradores';
    identified.push({
      userId: user.id,
      registration,
      name: user.fullname || registration,
      state,
      updatedAt:
        submission?.timemodified > 0
          ? new Date(submission.timemodified * 1000).toISOString()
          : null,
    });
  }
  if (!ids.size && unidentified)
    throw new Error(
      'Ningún participante tiene una matrícula visible. Verifica los campos autorizados.',
    );
  let expected = null;
  if (courseWide) expected = ids;
  if (included && [...included].every((id) => ids.has(id))) expected = included;
  const hasConflictingEvidence =
    expected && identified.some((row) => !expected.has(row.userId) && row.state !== null);
  if (hasConflictingEvidence) expected = null;
  const students = identified
    .filter((row) => row.state !== null || expected?.has(row.userId))
    .map(({ userId, state, ...row }) => ({ ...row, state: state ?? 'sin-entrega' }));
  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    students,
    unidentified,
    identifiedCount: ids.size,
    expectedCount: expected?.size ?? null,
    scopeReason: expected
      ? null
      : hasConflictingEvidence
        ? 'Hay evidencia de actividad fuera de la población indicada.'
        : (audience?.reason ??
          'El servicio de lectura no acredita la lista completa de destinatarios de esta tarea.'),
  };
}

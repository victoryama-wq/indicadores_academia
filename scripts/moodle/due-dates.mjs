// Tabla de calificación de Moodle: la prórroga individual prevalece sobre el vencimiento ajustado.
function timestamp(value) {
  return (
    Number.isSafeInteger(value) && value >= 0 && Number.isFinite(new Date(value * 1000).getTime())
  );
}

export async function effectiveDueDates(read, assignmentId, participants, functions) {
  const dates = new Map();
  const extended = new Set();
  const available = (name) => !Array.isArray(functions) || functions.some((fn) => fn.name === name);
  for (const row of participants) {
    dates.set(row.id, null);
    if (row.grantedextension === true || row.grantedextension === 1) {
      extended.add(row.id);
      continue;
    }
    if (!available('mod_assign_get_participant')) continue;
    try {
      const detail = await read('mod_assign_get_participant', {
        assignid: String(assignmentId),
        userid: String(row.id),
        embeduser: '0',
      });
      if (
        detail.id !== row.id ||
        ![false, 0].includes(detail.submitted) ||
        !['', 'new'].includes(detail.submissionstatus)
      )
        continue;
      if ([true, 1].includes(detail.grantedextension)) extended.add(row.id);
      else if ([false, 0].includes(detail.grantedextension) && timestamp(detail.duedate))
        dates.set(row.id, detail.duedate);
    } catch {
      // Un fallo por persona no invalida el cotejo ni las fechas de los demás.
    }
  }
  if (!extended.size || !available('mod_assign_get_user_flags')) return dates;
  try {
    const flags = await read('mod_assign_get_user_flags', {
      'assignmentids[0]': String(assignmentId),
    });
    if (flags.assignments?.length !== 1 || flags.assignments[0].assignmentid !== assignmentId)
      return dates;
    const rows = flags.assignments[0].userflags;
    if (!Array.isArray(rows)) return dates;
    for (const id of extended) {
      const matches = rows.filter((row) => row?.userid === id);
      if (
        matches.length === 1 &&
        timestamp(matches[0].extensionduedate) &&
        matches[0].extensionduedate > 0
      )
        dates.set(id, matches[0].extensionduedate);
    }
  } catch {
    // Con prórroga anunciada, la fecha ordinaria no acredita el vencimiento efectivo.
  }
  return dates;
}

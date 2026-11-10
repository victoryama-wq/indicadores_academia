import { countRecords, Snapshot } from './models';

/** Las filas ya representan pares únicos estudiante–actividad, nunca intentos de entrega. */
export function subjectRows(snapshot: Snapshot | null | undefined) {
  return (snapshot?.subjects ?? []).map((subject) => {
    const activities = (snapshot?.activities ?? [])
      .filter((a) => a.subjectId === subject.id)
      .map((activity) => {
        const records = (snapshot?.records ?? []).filter((r) => r.activityId === activity.id);
        return { ...activity, records, counts: countRecords(records) };
      });
    const records = activities.flatMap((a) => a.records);
    return {
      ...subject,
      group: snapshot?.groups.find((g) => g.id === subject.groupId),
      activities,
      records,
      counts: countRecords(records),
    };
  });
}

export function teacherRows(snapshot: Snapshot | null | undefined) {
  const subjects = subjectRows(snapshot);
  return (snapshot?.catalog.teachers ?? [])
    .map((teacher) => {
      const assignments = subjects.filter((s) => s.teacherId === teacher.id);
      const records = assignments.flatMap((s) => s.records);
      const groupIds = new Set(assignments.map((s) => s.groupId));
      return {
        ...teacher,
        subjects: assignments,
        groups: (snapshot?.groups ?? []).filter((g) => groupIds.has(g.id)),
        records,
        counts: countRecords(records),
      };
    })
    .filter((teacher) => teacher.subjects.length > 0);
}

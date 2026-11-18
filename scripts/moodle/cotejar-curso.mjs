import { randomUUID } from 'node:crypto';
import { rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { pathToFileURL } from 'node:url';
import { moodleReader } from './reader.mjs';

// Usar solamente cuando Sistemas ha verificado que la actividad corresponde a todo el curso.
export async function cotejarCurso(token, assignmentId, reportedSize, validUntil, request = fetch) {
  if (
    !Number.isSafeInteger(assignmentId) ||
    assignmentId < 1 ||
    !Number.isSafeInteger(reportedSize) ||
    reportedSize < 1 ||
    !(Date.parse(validUntil) > Date.now())
  )
    throw new Error(
      'Revisa la tarea, el total independiente de estudiantes y la fecha de vigencia.',
    );
  let evidence;
  const reader = moodleReader(token, request, ({ courseId, activity, site, activeUserIds }) => {
    if (activeUserIds.length !== reportedSize || !site.version) return undefined;
    evidence = {
      scope: 'course',
      courseId,
      assignmentId: activity.id,
      cmid: activity.cmid,
      version: String(site.version),
      serviceUserId: site.userid,
      userIds: activeUserIds,
      verifiedAt: new Date().toISOString(),
      validUntil,
    };
    return evidence;
  });
  const snapshot = await reader.snapshot(assignmentId);
  if (!evidence || snapshot.expectedCount !== reportedSize)
    throw new Error(
      'Cotejo incompleto. ' +
        (!evidence
          ? 'Comprueba la matrícula activa visible, el total académico y la versión de Moodle.'
          : snapshot.scopeReason),
    );
  return { evidence, snapshot };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const [assignment, size, until] = process.argv.slice(2);
    const token = (await text(process.stdin)).trim();
    if (!token) throw new Error('Introduce el token en el aviso local de PowerShell.');
    const { evidence, snapshot } = await cotejarCurso(
      token,
      Number(assignment),
      Number(size),
      until,
    );
    const target =
      process.env.MOODLE_COBERTURA_LOCAL || join(process.env.LOCALAPPDATA, 'cotejo-moodle.json');
    const temporary = target + '.' + randomUUID() + '.tmp';
    try {
      await writeFile(temporary, JSON.stringify(evidence), { flag: 'wx', mode: 0o600 });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    const missing = snapshot.students.filter((r) => r.state === 'sin-entrega').length;
    console.log(
      'Cotejo guardado. Estudiantes:',
      snapshot.expectedCount,
      '| Sin entrega:',
      missing,
      '| Corte:',
      snapshot.readAt,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

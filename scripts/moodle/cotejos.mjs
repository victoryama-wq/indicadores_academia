import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function legacyPath() {
  return (
    process.env.MOODLE_COBERTURA_LOCAL ||
    (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'cotejo-moodle.json'))
  );
}

function activityFile(base, course, assignment) {
  if (![course, assignment].every((id) => Number.isSafeInteger(id) && id > 0))
    throw new Error('El cotejo requiere identificadores de curso y tarea válidos.');
  return join(base + '.d', course + '-' + assignment + '.json');
}

export async function readEvidence({ courseId, activity }, base = legacyPath()) {
  if (!base) return undefined;
  for (const path of [activityFile(base, courseId, activity.id), base]) {
    try {
      const evidence = JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
      return evidence?.courseId === courseId && evidence.assignmentId === activity.id
        ? evidence
        : undefined;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export async function saveEvidence(evidence, base = legacyPath()) {
  if (!base) throw new Error('Configura MOODLE_COBERTURA_LOCAL en el equipo de Sistemas.');
  const target = activityFile(base, evidence.courseId, evidence.assignmentId);
  await mkdir(base + '.d', { recursive: true, mode: 0o700 });
  const temporary = target + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, JSON.stringify(evidence), { flag: 'wx', mode: 0o600 });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

const cycleNames = { p01: '27-1', p02: '27-2' };
export function cycleName(cycle) {
  return cycleNames[cycle];
}

const normalize = (s) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toUpperCase();
function locator(number, subject) {
  return JSON.stringify([number, normalize(subject)]);
}

export function matchCourses(cycle, offerings, courses) {
  const candidates = new Map();
  for (const course of courses) {
    const name = /^(\d+)\.?\s+(.+?)\s+(\d{2}-\d+)$/.exec(normalize(course.fullname));
    if (!name || name[3] !== cycleName(cycle)) continue;
    const key = locator(name[1], name[2]);
    const found = candidates.get(key) ?? [];
    found.push(course);
    candidates.set(key, found);
  }
  const claims = new Map();
  const keyed = offerings.map(({ row, numero, materia }) => {
    const number = /^(\d+)\.?$/.exec(numero.trim());
    const title = normalize(materia);
    const titles = new Set([title, title.replace(/^[A-Z]{2,8}\d{2,4} - /, '')]);
    const found = number
      ? [...titles].flatMap((t) => candidates.get(locator(number[1], t)) ?? [])
      : [];
    for (const course of found) claims.set(course.id, (claims.get(course.id) ?? 0) + 1);
    return { row, number, found };
  });
  return keyed.map(({ row, number, found }) => {
    if (!number) return { row, status: 'review', reason: 'Número de asignatura no reconocible.' };
    if (!found.length)
      return {
        row,
        status: 'missing',
        reason: 'Sin coincidencia en el catálogo visible de este ciclo.',
      };
    if (found.some((course) => claims.get(course.id) > 1))
      return {
        row,
        status: 'review',
        reason: 'Varias imparticiones SPAI reclaman el mismo localizador, materia y ciclo.',
      };
    if (found.length > 1)
      return {
        row,
        status: 'review',
        reason: 'Más de un curso Moodle coincide con el número, la materia y el ciclo.',
      };
    return { row, status: 'linked', courseId: found[0].id, fullname: found[0].fullname };
  });
}

// One active SPAI version per tab and cycle. Results from superseded requests cannot restore old links.
export function courseLinkRoutes(reader) {
  const active = new Map();
  return async (req, path, json) => {
    const route =
      /^\/api\/moodle\/vinculos\/([a-f0-9-]{36})\/(p01|p02)\/([1-9]\d*)(?:\/(\d+)\/actividades(?:\/([1-9]\d*))?)?$/.exec(
        path,
      );
    if (!route) return json(404, { error: 'Ruta de vinculación desconocida.' });
    const [, tab, cycle, rawVersion, courseId, activity] = route;
    const version = Number(rawVersion);
    if (!Number.isSafeInteger(version)) return json(400, { error: 'Versión inválida.' });
    const scope = tab + ':' + cycle;
    const previous = active.get(scope);
    const stale = () =>
      json(409, { error: 'Vuelve a vincular la versión vigente de SPAI desde Insumos.' });
    if (req.method === 'POST' && courseId === undefined) {
      if (previous && previous.version > version) return stale();
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) return json(413, { error: 'Archivo demasiado grande.' });
        chunks.push(chunk);
      }
      let offerings;
      try {
        offerings = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return json(400, { error: 'JSON inválido.' });
      }
      if (
        !Array.isArray(offerings) ||
        offerings.length > 5000 ||
        offerings.some(
          (r) =>
            !Number.isSafeInteger(r?.row) ||
            r.row < 0 ||
            typeof r.numero !== 'string' ||
            typeof r.materia !== 'string' ||
            !r.numero.trim() ||
            !r.materia.trim(),
        ) ||
        new Set(offerings.map((r) => r.row)).size !== offerings.length
      ) {
        return json(400, { error: 'Las imparticiones de la versión son inválidas.' });
      }
      if (active.get(scope)?.version > version) return stale();
      const entry = { version, links: null };
      active.set(scope, entry);
      const courses = offerings.length ? await reader.searchCourses(cycleName(cycle)) : [];
      if (active.get(scope) !== entry) return stale();
      entry.links = matchCourses(cycle, offerings, courses);
      return json(200, entry.links);
    }
    if (req.method !== 'GET') return json(405, { error: 'Método no disponible.' });
    if (previous?.version !== version || !previous.links) return stale();
    if (courseId === undefined) return json(200, previous.links);
    const link = previous.links.find(
      (link) => link.courseId === Number(courseId) && link.status === 'linked',
    );
    if (!link) return json(404, { error: 'Impartición sin vínculo confirmado en este ciclo.' });
    const data = activity
      ? await reader.snapshot(Number(activity), link)
      : await reader.catalog(link);
    if (active.get(scope) !== previous) return stale();
    return json(200, data);
  };
}

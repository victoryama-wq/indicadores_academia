import { text } from 'node:stream/consumers';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { courseLinkRoutes } from './course-links.mjs';
import { moodleReader } from './reader.mjs';

const origin = 'http://127.0.0.1:4380';
const dist = new URL('../../dist/indicadores-academia-demo/browser/', import.meta.url);
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
};
function sameKey(received, key) {
  const actual = Buffer.from(received ?? ''),
    expected = Buffer.from('Bearer ' + key);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function pilotServer(reader, key) {
  const links = courseLinkRoutes(reader);
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    function json(status, value) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    }
    const host = '127.0.0.1:' + req.socket.localPort;
    if (
      req.headers.host !== host ||
      (req.headers.origin && req.headers.origin !== 'http://' + host)
    )
      return json(403, { error: 'Origen local requerido.' });
    const path = req.url.split('?')[0];
    if (path.startsWith('/api/')) {
      if (!sameKey(req.headers.authorization, key))
        return json(401, { error: 'La clave local del piloto es incorrecta.' });
      try {
        return await links(req, path, json);
      } catch (error) {
        return json(502, {
          error:
            error instanceof Error &&
            /^(Curso localizado |Moodle |No se pudo |Consulta incompleta |El curso |Esta actividad |Ningún participante )/u.test(
              error.message,
            )
              ? error.message
              : 'No se pudo completar la lectura de Moodle.',
        });
      }
    }
    if (req.method !== 'GET') return json(405, { error: 'Método no disponible.' });
    if (!/^\/(?:[\w.-]+\/)*[\w.-]*$/.test(path) || path.split('/').some((p) => p.startsWith('.')))
      return json(404, { error: 'Ruta desconocida.' });
    const file = extname(path) ? path.slice(1) : 'index.html';
    if (!Object.hasOwn(mime, extname(file))) return json(404, { error: 'Archivo desconocido.' });
    try {
      const data = await readFile(new URL(file, dist));
      res.writeHead(200, { 'Content-Type': mime[extname(file)] }).end(data);
    } catch {
      json(404, { error: 'Archivo no encontrado.' });
    }
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const token = process.argv.includes('--token-stdin')
    ? (await text(process.stdin)).trim()
    : process.env.MOODLE_TOKEN?.trim();
  delete process.env.MOODLE_TOKEN;
  if (!token) throw new Error('Proporciona el token al iniciar el piloto desde PowerShell.');
  const coveragePath =
    process.env.MOODLE_COBERTURA_LOCAL ||
    (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'cotejo-moodle.json'));
  const reader = moodleReader(
    token,
    fetch,
    coveragePath
      ? async () => {
          try {
            return JSON.parse((await readFile(coveragePath, 'utf8')).replace(/^\uFEFF/, ''));
          } catch (error) {
            if (error.code === 'ENOENT') return undefined;
            throw error;
          }
        }
      : undefined,
  );
  const probe = process.argv.indexOf('--comprobar-participantes');
  const dateProbe = process.argv.indexOf('--comprobar-fechas');
  const courseArg = process.argv.indexOf('--curso');
  const link = { courseId: courseArg < 0 ? null : Number(process.argv[courseArg + 1]) };
  if (dateProbe !== -1) {
    try {
      const user = process.argv[dateProbe + 2];
      const result = await reader.probeDueDates(
        Number(process.argv[dateProbe + 1]),
        user && !user.startsWith('--') ? Number(user) : undefined,
        link,
      );
      for (const [name, status] of result.functions)
        console.log('Función', name, '| anunciada:', status);
      console.log(
        'Diagnóstico de fechas:',
        result.mode,
        '| filas evaluadas:',
        result.assessed,
        '| fechas determinadas (incluye sin fecha):',
        result.confirmed,
      );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  } else if (probe !== -1) {
    const assignmentId = Number(process.argv[probe + 1]);
    let site;
    try {
      site = await reader.siteInfo();
      console.log(
        'Versión instalada:',
        site.release ?? 'no informada',
        '| build:',
        site.version ?? 'no informado',
      );
      if (Array.isArray(site.functions))
        console.log(
          'Función mod_assign_list_participants anunciada:',
          site.functions.some((fn) => fn.name === 'mod_assign_list_participants') ? 'sí' : 'no',
        );
    } catch (error) {
      console.log('Diagnóstico de identidad:', error.message);
      process.exitCode = 1;
    }
    try {
      const context = await reader.catalog(link);
      const activity = context.activities.find((a) => a.id === assignmentId && a.supported);
      if (!activity) throw new Error('Selecciona una tarea individual del catálogo del piloto.');
      console.log('Curso:', context.courseId, '| tarea:', activity.id, '| módulo:', activity.cmid);
      const rows = await reader.participants(assignmentId);
      if (!Array.isArray(rows))
        throw new Error('Respuesta incompleta en mod_assign_list_participants.');
      console.log('Filas visibles:', rows.length);
      if (site) {
        const others = rows.filter((r) => r.id !== site.userid);
        console.log('Filas de la cuenta del token:', rows.length - others.length);
        console.log(
          'Filas restantes con estado explícito vacío o nuevo:',
          others.filter(
            (r) => ['', 'new'].includes(r.submissionstatus) && [false, 0].includes(r.submitted),
          ).length,
        );
      }
      console.log(
        'El alcance se comprueba por identidad contra los destinatarios efectivos en Moodle.',
      );
    } catch (error) {
      console.log('Diagnóstico de participantes:', error.message);
      process.exitCode = 1;
    }
  } else {
    await access(new URL('index.html', dist)).catch(() => {
      throw new Error('Ejecuta npm run build antes de iniciar el piloto.');
    });
    const key = randomBytes(32).toString('base64url');
    pilotServer(reader, key)
      .once('error', () => {
        console.error('No se pudo abrir el puerto local 4380.');
        process.exitCode = 1;
      })
      .listen(4380, '127.0.0.1', () => {
        console.log('Abre ' + origin + '/reportes y selecciona Sistemas → Insumos por ciclo');
        console.log('Clave local de esta ejecución: ' + key);
      });
  }
}

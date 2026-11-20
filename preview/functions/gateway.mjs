import express from 'express';
import { join } from 'node:path';

const duration = 60 * 60 * 1000;

export function previewGateway({ auth, origin, systemsUid, directory }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.vary('Cookie');
    next();
  });

  function allowed(claims) {
    return (
      Boolean(systemsUid()) &&
      claims.uid === systemsUid() &&
      claims.firebase?.sign_in_provider === 'google.com' &&
      claims.email_verified === true &&
      typeof claims.email === 'string' &&
      /^[^@\s]+@tecplayacar\.edu\.mx$/i.test(claims.email)
    );
  }
  app.post(['/sesion', '/salir'], (req, res, next) => {
    if (!origin() || req.get('Origin') !== origin()) return res.sendStatus(403);
    next();
  });
  app.post('/salir', (_req, res) => {
    res.clearCookie('__session', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    res.redirect(303, '/ingreso.html');
  });
  app.post('/sesion', express.json({ limit: '16kb' }), async (req, res) => {
    const token = req.body?.idToken;
    if (typeof token !== 'string') return res.sendStatus(400);
    try {
      const claims = await auth.verifyIdToken(token, true);
      if (!allowed(claims)) return res.sendStatus(403);
      const age = Date.now() / 1000 - claims.auth_time;
      if (!Number.isFinite(age) || age < -60 || age > 300) return res.sendStatus(401);
      const cookie = await auth.createSessionCookie(token, { expiresIn: duration });
      res.cookie('__session', cookie, {
        maxAge: duration,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      });
      res.sendStatus(204);
    } catch {
      res.sendStatus(401);
    }
  });
  app.use(async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return res.sendStatus(405);
    const cookie = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith('__session='));
    if (cookie) {
      try {
        const claims = await auth.verifySessionCookie(cookie.slice('__session='.length), true);
        if (!allowed(claims)) return res.sendStatus(403);
        return next();
      } catch {
        /* Solicitar una sesión nueva. */
      }
    }
    if (req.accepts(['html', 'json']) === 'html' && !req.path.split('/').at(-1).includes('.'))
      return res.redirect(302, '/ingreso.html');
    return res.sendStatus(401);
  });
  app.use((req, res, next) => {
    if (/^\/(api|admin|reportes\/moodle)(\/|$)/i.test(req.path)) return res.sendStatus(403);
    next();
  });
  app.use(express.static(directory, { index: false, redirect: false, cacheControl: false }));
  app.use((req, res) => {
    if (req.path.includes('.') || !req.accepts('html')) return res.sendStatus(404);
    res.sendFile(join(directory, 'index.html'), { cacheControl: false });
  });
  return app;
}

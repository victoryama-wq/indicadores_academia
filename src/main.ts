import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

async function start() {
  if (
    location.origin === 'http://127.0.0.1:4380' &&
    location.pathname.replace(/\/$/, '') === '/reportes/moodle'
  ) {
    const { PilotShell, MoodlePilot } = await import('./app/features/reports/moodle/pilot');
    const { provideRouter } = await import('@angular/router');
    return bootstrapApplication(PilotShell, {
      providers: [
        provideRouter([
          { path: 'reportes/moodle', title: 'Lectura Moodle · Academia', component: MoodlePilot },
          { path: '**', redirectTo: 'reportes/moodle' },
        ]),
      ],
    });
  }
  return bootstrapApplication(App, appConfig);
}

start().catch((err) => console.error(err));

import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { NavigationContext } from './core/navigation-context';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: 'inicio',
    title: 'Inicio · Academia',
    loadComponent: () => import('./features/home/home/home').then((m) => m.Home),
  },
  {
    path: 'grupos',
    loadChildren: () => import('./features/groups/groups.routes').then((m) => m.GROUP_ROUTES),
  },
  {
    path: 'asignaturas/:imparticionId',
    title: 'Asignatura · Academia',
    loadComponent: () =>
      import('./features/subjects/subject-detail/subject-detail').then((m) => m.SubjectDetail),
  },
  {
    path: 'actividades/:actividadId',
    title: 'Actividad · Academia',
    loadComponent: () =>
      import('./features/activities/activity-detail/activity-detail').then((m) => m.ActivityDetail),
  },
  {
    path: 'seguimiento/:registroId',
    title: 'Ficha de seguimiento · Academia',
    loadComponent: () => import('./features/followup/followup/followup').then((m) => m.Followup),
  },
  ...['docentes', 'reportes', 'historicos', 'calidad'].map((path) => ({
    path,
    title: 'Próximamente · Academia',
    data: {
      kind: 'upcoming',
      label: (
        {
          docentes: 'Seguimiento docente',
          reportes: 'Reportes',
          historicos: 'Históricos',
          calidad: 'Calidad de información',
        } as Record<string, string>
      )[path],
    },
    loadComponent: () =>
      import('./features/system/status-page/status-page').then((m) => m.StatusPage),
  })),
  {
    path: 'admin/:section',
    canActivate: [
      () =>
        inject(NavigationContext).profile() === 'sistemas' ||
        inject(Router).createUrlTree(['/restringido'], {
          queryParams: inject(NavigationContext).query(),
        }),
    ],
    data: { kind: 'upcoming', label: 'Administración e integración' },
    loadComponent: () =>
      import('./features/system/status-page/status-page').then((m) => m.StatusPage),
  },
  {
    path: 'restringido',
    data: { kind: 'restricted' },
    loadComponent: () =>
      import('./features/system/status-page/status-page').then((m) => m.StatusPage),
  },
  {
    path: '**',
    data: { kind: 'missing' },
    loadComponent: () =>
      import('./features/system/status-page/status-page').then((m) => m.StatusPage),
  },
];

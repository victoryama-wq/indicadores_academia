import { Routes } from '@angular/router';
export const GROUP_ROUTES: Routes = [
  {
    path: '',
    title: 'Grupos · Academia',
    loadComponent: () => import('./groups/groups').then((m) => m.Groups),
  },
  {
    path: ':grupoId',
    title: 'Grupo · Academia',
    loadComponent: () => import('./group-detail/group-detail').then((m) => m.GroupDetail),
  },
];

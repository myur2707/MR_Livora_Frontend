import type { Routes } from '@angular/router';

export const SOCIETY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Community space · SocietyEase',
    data: {
      breadcrumb: 'Dashboard',
      heading: 'Your community space',
      eyebrow: 'SOCIETY WORKSPACE',
      message: 'One welcoming place for the everyday life of your society.',
    },
    loadComponent: () =>
      import('../workspace-placeholder').then((m) => m.WorkspacePlaceholderComponent),
  },
];

import type { Routes } from '@angular/router';

export const PLATFORM_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Overview · SocietyEase',
    data: { breadcrumb: 'Overview' },
    loadComponent: () => import('./overview').then((m) => m.OverviewComponent),
  },
  {
    path: 'societies',
    title: 'Societies · SocietyEase',
    data: {
      breadcrumb: 'Societies',
      heading: 'Your societies',
      eyebrow: 'PLATFORM WORKSPACE',
      message: 'A shared home for every community you bring together.',
    },
    loadComponent: () =>
      import('../workspace-placeholder').then((m) => m.WorkspacePlaceholderComponent),
  },
];

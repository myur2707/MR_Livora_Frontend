import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'platform/dashboard' },
  {
    path: 'login',
    title: 'Sign in · SocietyEase',
    loadComponent: () =>
      import('./features/auth/auth-placeholder').then((m) => m.AuthPlaceholderComponent),
    data: { mode: 'login' },
  },
  {
    path: 'forgot-password',
    title: 'Reset password · SocietyEase',
    loadComponent: () =>
      import('./features/auth/auth-placeholder').then((m) => m.AuthPlaceholderComponent),
    data: { mode: 'reset' },
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'platform',
        data: { breadcrumb: 'Platform' },
        loadChildren: () =>
          import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES),
      },
      {
        path: 'society',
        data: { breadcrumb: 'Community' },
        loadChildren: () =>
          import('./features/society/society.routes').then((m) => m.SOCIETY_ROUTES),
      },
      {
        path: 'ui',
        title: 'UI library · SocietyEase',
        data: { breadcrumb: 'UI library' },
        loadComponent: () => import('./features/ui/ui-preview').then((m) => m.UiPreviewComponent),
      },
      {
        path: '**',
        title: 'Page not found · SocietyEase',
        data: { breadcrumb: 'Page not found' },
        loadComponent: () => import('./features/not-found').then((m) => m.NotFoundComponent),
      },
    ],
  },
];

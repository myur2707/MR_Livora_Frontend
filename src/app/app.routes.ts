import type { Routes } from '@angular/router';
import { authGuard, platformGuard, societyGuard } from './core/auth-guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workspace' },
  {
    path: 'login',
    title: 'Sign in · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'login' },
  },
  {
    path: 'forgot-password',
    title: 'Reset password · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'forgot' },
  },
  {
    path: 'reset-password',
    title: 'Set a new password · SocietyEase',
    loadComponent: () => import('./features/auth/auth-page').then((m) => m.AuthPageComponent),
    data: { mode: 'reset' },
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'workspace',
        title: 'Choose workspace · SocietyEase',
        data: { breadcrumb: 'Workspace' },
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/workspace').then((m) => m.WorkspaceComponent),
      },
      {
        path: 'platform',
        canActivate: [platformGuard],
        canActivateChild: [platformGuard],
        data: { breadcrumb: 'Platform' },
        loadChildren: () =>
          import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES),
      },
      {
        path: 'society',
        canActivate: [societyGuard],
        canActivateChild: [societyGuard],
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
